import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { it } from "node:test";
import ts from "typescript";
import { buildProductActionRequest } from "./admin-product-action-rules";
import { productDocumentFromAdmin } from "./admin-product-form-rules";
import { portableTextToPlain, slugify, textToPortableText } from "./db/publish";
import { isAdminUploadUrl } from "./admin-upload-rules";
import { AdminRequestError } from "./admin-request-error";
import { isProductRevision, productNumberText, validateProductInput } from "./admin-product-input";
import type { AdminProduct } from "./db/admin-types";
import type { ProductDocument } from "./db/publish";

type Tree = { type: unknown; props: Record<string, unknown> };
type Slot = { value?: unknown; cleanup?: () => void; effect?: boolean };
function findAll(node: unknown, predicate: (tree: Tree) => boolean): Tree[] {
  if (Array.isArray(node)) return node.flatMap((child) => findAll(child, predicate));
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const tree = node as Tree;
  return [...(predicate(tree) ? [tree] : []), ...findAll(tree.props.children, predicate)];
}
function hooks() {
  const slots: Slot[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  return {
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
        return [slots[index].value, (next: unknown) => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
      },
      useRef(initial: unknown) {
        const index = cursor++; slots[index] ??= { value: { current: initial } }; return slots[index].value;
      },
      useMemo: (factory: () => unknown) => factory(),
      useCallback: (callback: unknown) => callback,
      useEffect(callback: () => (() => void) | undefined) {
        const index = cursor++;
        if (!slots[index]?.effect) effects.push(() => { slots[index] = { effect: true, cleanup: callback() }; });
      },
    },
    render<T>(callback: () => T): T { cursor = 0; const result = callback(); effects.splice(0).forEach((run) => run()); return result; },
    unmount() { slots.forEach((slot) => slot.cleanup?.()); },
  };
}
const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
function load(file: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const exports: Record<string, unknown> = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, URL, Error,
    require(name: string) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
    ...globals,
  });
  return exports;
}
type RequestRecord = { path: string; options: { body: string }; resolve: (value: unknown) => void; reject: (error: Error) => void };
function editor(overrides: Partial<AdminProduct> | null = {}) {
  const state = hooks();
  const requests: RequestRecord[] = [];
  const timers: (() => void)[] = [];
  const baselines: unknown[] = [];
  const dirtyStates: unknown[] = [];
  const redirects: string[] = [];
  let savedFingerprint: string | undefined;
  let dynamicIndex = 0;
  const dependencies: Record<string, unknown> = {
    react: state.react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/dynamic": { default: () => ++dynamicIndex === 1 ? "media" : "axes" },
    "next/link": { default: "link" },
    "next/navigation": { useRouter: () => ({ replace(path: string) { redirects.push(path); } }) },
    "@/components/admin/string-array-input": { StringArrayInput: "strings" },
    "@/components/admin/object-array-input": { ObjectArrayInput: "objects" },
    "@/components/admin/publish-bar": { PublishBar: "publish" },
    "@/components/admin/admin-sticky-publish-bar": { AdminStickyPublishBar: "sticky" },
    "@/components/admin/use-admin-form-dirty": { useAdminFormDirty: (value: unknown) => {
      dirtyStates.push(value); const fingerprint = JSON.stringify(value); savedFingerprint ??= fingerprint;
      return { dirty: fingerprint !== savedFingerprint, resetSaved: (value: unknown) => { baselines.push(value); savedFingerprint = JSON.stringify(value); } };
    } },
    "@/components/admin/product-collections-fields": { ProductCollectionsFields: "collections" },
    "@/components/admin/admin-fetch": {
      AdminRequestError,
      AdminAuthError: class extends Error {},
      adminFetch: (path: string, options: { body: string }) => new Promise((resolve, reject) => requests.push({ path, options, resolve, reject })),
    },
    "@/lib/admin-product-action-rules": { buildProductActionRequest },
    "@/lib/admin-product-form-rules": { productDocumentFromAdmin },
    "@/lib/admin-product-input": { isProductRevision, productNumberText, validateProductInput },
    "@/lib/db/publish": { portableTextToPlain, slugify, textToPortableText },
    "@/lib/product-image": { PRODUCT_PHOTO_HINT: "Synthetic" },
  };
  for (const [file, name, tag] of [["button", "Button", "button"], ["input", "Input", "input"], ["label", "Label", "label"], ["textarea", "Textarea", "textarea"], ["badge", "Badge", "badge"]]) {
    dependencies[`@/components/ui/${file}`] = { [name]: tag };
  }
  const editorModule = load("../components/admin/product-form.tsx", dependencies, { setTimeout: (callback: () => void) => timers.push(callback), confirm: () => true });
  const component = editorModule.ProductForm as (props: unknown) => Tree;
  const product = overrides === null ? null : { _id: "fixture", name: "Synthetic", slug: "synthetic", category: "audio", price: 1200,
    adminRevision: "4", inventoryRevision: "7", stockStatus: "in-stock", quantity: 2, images: [], status: "published", draft: null, addons: [{ name: "Case", price: 10 }], ...overrides };
  function render() { return state.render(() => component({ product, shopTypes: [{ slug: "audio" }], collectionIds: ["saved-collection"] })); }
  function node(type: string) { return findAll(render(), (tree) => tree.type === type)[0]; }
  return {
    render, node, requests, baselines, dirtyStates, redirects,
    field(id: string) { return findAll(render(), (tree) => tree.props.id === id)[0]; },
    change(id: string, value: string) { (this.field(id).props.onChange as (event: unknown) => void)({ target: { value } }); },
    button(label: string) { return findAll(render(), (tree) => tree.type === "button" && tree.props.children === label)[0]; },
    async action(name: string) { return (node("publish").props[name] as () => Promise<void>)(); },
    flush() { timers.splice(0).forEach((resolve) => resolve()); },
    busy(value: boolean) { (node("media").props.onBusyChange as (value: boolean) => void)(value); },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));
const confirmed = (overrides: Record<string, unknown> = {}) => ({ ok: true, id: "fixture", adminRevision: "5", inventoryRevision: "7", quantity: 2, stockStatus: "in-stock", ...overrides });

for (const quantity of ["8", "0", ""]) {
  it(`keeps explicit initial inventory ${JSON.stringify(quantity)} across create and reload`, async () => {
    const subject = editor(null); subject.change("name", "New item"); subject.change("category", "audio"); subject.change("price", "100");
    subject.change("quantity", quantity); subject.change("stock", "out-of-stock");
    const createButton = findAll(subject.render(), (node) => node.type === "button" && typeof node.props.onClick === "function")[0];
    const operation = (createButton.props.onClick as () => Promise<void>)(); subject.flush(); await settle();
    const body = JSON.parse(subject.requests[0].options.body);
    assert.deepEqual(body.doc.inventoryIntent, { mode: "adjust", expectedRevision: "0", quantity: quantity === "" ? null : Number(quantity), stockStatus: "out-of-stock" });
    const reloaded = productDocumentFromAdmin({ _id: "new", name: "New item", slug: "new-item", category: "audio", price: 100, images: [], stockStatus: "in-stock", quantity: null, status: "draft", draft: body.doc }, ["audio"]);
    assert.equal(reloaded.quantity, body.doc.quantity); assert.equal(reloaded.inventoryIntent?.mode, "adjust");
    subject.requests[0].resolve(confirmed({ id: "new", adminRevision: "0", inventoryRevision: "0", quantity: null })); await operation;
  });
}

for (const failure of [new AdminRequestError("Unconfirmed", 502, true), new AdminRequestError("Transport lost", undefined, true)]) {
  it(`locks unknown mutation outcome ${failure.message} until reload`, async () => {
    const subject = editor(); const operation = subject.action("onSave"); subject.flush(); await settle();
    subject.requests[0].reject(failure); await operation;
    assert.equal(subject.baselines.length, 0); assert.equal(subject.node("fieldset").props.disabled, true);
    await subject.action("onSave"); assert.equal(subject.requests.length, 1);
  });
}

it("leaves unchanged memberships alone and persists an explicit draft membership intent", async () => {
  const subject = editor();
  const save = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[0].options.body).collectionIds, null);
  subject.requests[0].resolve(confirmed()); await save;
  (subject.node("collections").props.onChange as (ids: string[]) => void)(["draft-selection"]);
  const edited = subject.action("onSave"); subject.flush(); await settle();
  assert.deepEqual(JSON.parse(subject.requests[1].options.body).collectionIds, ["draft-selection"]);
  subject.requests[1].resolve(confirmed({ adminRevision: "6" })); await edited;
  const publish = subject.action("onPublish"); subject.flush(); await settle();
  assert.deepEqual(JSON.parse(subject.requests[2].options.body).collectionIds, ["draft-selection"]);
  subject.requests[2].resolve(confirmed({ adminRevision: "7" })); await publish;
  const subsequent = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[3].options.body).collectionIds, null);
  subject.requests[3].resolve(confirmed({ adminRevision: "8" })); await subsequent;
});

it("uses a shrinkable explicit single-column editor grid before the desktop breakpoint", () => {
  const subject = editor();
  const grid = subject.node("fieldset");
  assert.match(String(grid.props.className), /\bgrid-cols-1\b/);
  assert.match(String(grid.props.className), /\blg:grid-cols-3\b/);
  const columns = (grid.props.children as Tree[]).filter((child) => child?.type === "div");
  assert.equal(columns.length, 2);
  assert.ok(columns.every((column) => /\bmin-w-0\b/.test(String(column.props.className))));
});

it("locks before the blur wait so two Save activations create one mutation, then permits failure retry", async () => {
  const subject = editor();
  const first = subject.action("onSave"); const duplicate = subject.action("onSave");
  subject.flush(); await settle();
  assert.equal(subject.requests.length, 1);
  subject.requests[0].reject(new Error("Synthetic failure"));
  await Promise.all([first, duplicate]);
  assert.equal(subject.baselines.length, 0);
  const retry = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(subject.requests.length, 2);
  subject.requests[1].resolve(confirmed()); await retry;
  assert.equal(subject.baselines.length, 1);
});

it("blocks pending uploads synchronously and rechecks those started during the blur window", async () => {
  const subject = editor(); subject.busy(true);
  await subject.action("onPublish"); assert.equal(subject.requests.length, 0);
  subject.busy(false);
  const save = subject.action("onSave"); subject.busy(true); subject.flush(); await save;
  assert.equal(subject.requests.length, 0);
  subject.busy(false);
  const retry = subject.action("onSave"); subject.flush(); await settle();
  subject.requests[0].resolve(confirmed()); await retry;
});

it("wires photos, poster, add-on and color uploads to one pending counter and disables editing", () => {
  const subject = editor();
  const media = findAll(subject.render(), (node) => node.type === "media");
  assert.equal(media.length, 3);
  assert.ok(media.every((node) => typeof node.props.onBusyChange === "function"));
  assert.equal(typeof subject.node("axes").props.onBusyChange, "function");
  subject.busy(true);
  assert.equal(subject.node("fieldset").props.disabled, true);
  assert.equal(subject.node("axes").props.disabled, true);
  subject.busy(false); assert.equal(subject.node("fieldset").props.disabled, false);
});

it("does not mark unsaved document fields clean when only unpublishing", async () => {
  const subject = editor(); const operation = subject.action("onUnpublish"); subject.flush(); await settle();
  subject.requests[0].resolve(confirmed()); await operation;
  assert.equal(subject.baselines.length, 0);
});

it("discards unsaved memberships and restores the editor's most recently published document", async () => {
  const subject = editor();
  const nameInput = findAll(subject.render(), (node) => node.props.id === "name")[0];
  (nameInput.props.onChange as (event: unknown) => void)({ target: { value: "New published title" } });
  const publish = subject.action("onPublish"); subject.flush(); await settle();
  subject.requests[0].resolve(confirmed()); await publish;
  (subject.node("collections").props.onChange as (ids: string[]) => void)(["unsaved-collection"]);
  const discard = subject.action("onDiscard"); subject.flush(); await settle();
  subject.requests[1].resolve(confirmed({ adminRevision: "6" })); await discard;
  const input = findAll(subject.render(), (node) => node.props.id === "name")[0];
  assert.equal(input.props.value, "New published title");
  assert.equal(JSON.stringify(subject.node("collections").props.selectedIds), '["saved-collection"]');
});

for (const [field, raw] of [["price", ""], ["price", "-"], ["price", "-1"], ["price", "1.001"], ["price", "Infinity"], ["quantity", "-1"], ["quantity", "1.5"], ["quantity", "-"], ["quantity", "2147483648"], ["addon-price-0", ""], ["addon-price-0", "-4"], ["compare", "oops"], ["cost", "1.001"]]) {
  it(`retains invalid raw ${field} text ${JSON.stringify(raw)} and blocks mutation`, async () => {
    const subject = editor(); subject.change(field, raw);
    assert.equal(subject.node("publish").props.dirty, true);
    assert.equal(subject.field(field).props.type, "text");
    assert.equal(subject.field(field).props.value, raw);
    const operation = subject.action("onSave"); subject.flush(); await operation;
    assert.equal(subject.requests.length, 0);
    assert.ok(findAll(subject.render(), (node) => node.props.role === "alert").length);
    const rawNumbers = (subject.dirtyStates.at(-1) as { numbers: Record<string, unknown> }).numbers;
    assert.equal(field === "addon-price-0" ? (rawNumbers.addons as string[])[0] : rawNumbers[field], raw);
  });
}

it("submits deliberate optional clears as null and permits zero draft pricing but blocks zero publication", async () => {
  const subject = editor({ compareAtPrice: 1500, costPrice: 100 });
  subject.change("compare", ""); subject.change("cost", ""); subject.change("quantity", ""); subject.change("price", "0");
  const save = subject.action("onSave"); subject.flush(); await settle();
  const body = JSON.parse(subject.requests[0].options.body);
  assert.equal(body.doc.price, 0); assert.equal(body.doc.compareAtPrice, null); assert.equal(body.doc.costPrice, null); assert.equal(body.doc.quantity, null);
  assert.deepEqual(body.doc.inventoryIntent, { mode: "adjust", expectedRevision: "7", quantity: null, stockStatus: "in-stock" });
  subject.requests[0].resolve(confirmed()); await save;
  assert.equal(subject.node("publish").props.dirty, false);
  const publish = subject.action("onPublish"); subject.flush(); await publish;
  assert.equal(subject.requests.length, 1);
});

it("validates new product raw price before create and redirects after a confirmed creation", async () => {
  const subject = editor(null); subject.change("name", "New item"); subject.change("category", "audio"); subject.change("price", "");
  // The JSX children include an upload indicator slot; locate the action through the sticky bar.
  const clickCreate = () => (findAll(subject.render(), (node) => node.type === "button" && typeof node.props.onClick === "function")[0].props.onClick as () => Promise<void>)();
  const invalid = clickCreate(); subject.flush(); await invalid; assert.equal(subject.requests.length, 0);
  subject.change("price", "0"); const valid = clickCreate(); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[0].options.body).doc.price, 0);
  assert.equal("expectedAdminRevision" in JSON.parse(subject.requests[0].options.body), false);
  subject.requests[0].resolve(confirmed({ id: "new-product", adminRevision: "0", inventoryRevision: "0", quantity: null })); await valid;
  assert.deepEqual(subject.redirects, ["/admin/products/new-product"]);
});

it("forwards the latest confirmed editor revision while retaining an adjustment's original inventory revision after save", async () => {
  const subject = editor(); subject.change("quantity", "8");
  const save = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[0].options.body).expectedAdminRevision, "4");
  subject.requests[0].resolve(confirmed({ inventoryRevision: "8", quantity: 1 })); await save;
  assert.equal(subject.field("quantity").props.value, "8");
  subject.change("quantity", "9");
  const publish = subject.action("onPublish"); subject.flush(); await settle();
  const body = JSON.parse(subject.requests[1].options.body);
  assert.equal(body.expectedAdminRevision, "5");
  assert.deepEqual(body.doc.inventoryIntent, { mode: "adjust", expectedRevision: "7", quantity: 9, stockStatus: "in-stock" });
  subject.requests[1].reject(new Error("Inventory changed. Reload the product.")); await publish;
  assert.equal(subject.field("quantity").props.value, "9");
  assert.ok(subject.button("Keep live inventory"));
  (subject.button("Keep live inventory").props.onClick as () => void)();
  assert.equal(subject.field("quantity").props.value, "1");
  subject.change("quantity", "3");
  const retry = subject.action("onPublish"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[2].options.body).doc.inventoryIntent.expectedRevision, "8");
  subject.requests[2].resolve(confirmed({ adminRevision: "6", inventoryRevision: "9", quantity: 3 })); await retry;
  assert.equal(subject.button("Keep live inventory"), undefined);
});

it("retains saved adjustment intent across reload and does not rebase it when availability changes", async () => {
  const draft = { name: "Draft", slug: "synthetic", category: "audio", price: 1200, images: [], quantity: 9, stockStatus: "low-stock",
    inventoryIntent: { mode: "adjust", expectedRevision: "2", quantity: 9, stockStatus: "low-stock" } } as ProductDocument;
  const subject = editor({ draft, inventoryRevision: "10", quantity: 1 });
  assert.equal(subject.field("quantity").props.value, "9"); subject.change("stock", "out-of-stock");
  const save = subject.action("onSave"); subject.flush(); await settle();
  assert.deepEqual(JSON.parse(subject.requests[0].options.body).doc.inventoryIntent, { mode: "adjust", expectedRevision: "2", quantity: 9, stockStatus: "out-of-stock" });
  subject.requests[0].resolve(confirmed({ inventoryRevision: "11", quantity: 0, stockStatus: "out-of-stock" })); await save;
  assert.equal(subject.field("quantity").props.value, "9");
});

it("uses current inventory for legacy drafts and refreshes preserve values from confirmed saves", async () => {
  const draft = { name: "Draft", slug: "synthetic", category: "audio", price: 1200, images: [], quantity: 99, stockStatus: "out-of-stock" } as ProductDocument;
  const subject = editor({ draft, quantity: 2 });
  assert.equal(subject.field("quantity").props.value, "2"); assert.equal(subject.field("stock").props.value, "in-stock");
  const save = subject.action("onSave"); subject.flush(); await settle();
  assert.deepEqual(JSON.parse(subject.requests[0].options.body).doc.inventoryIntent, { mode: "preserve" });
  subject.requests[0].resolve(confirmed({ inventoryRevision: "8", quantity: 1, stockStatus: "low-stock" })); await save;
  assert.equal(subject.field("quantity").props.value, "1"); assert.equal(subject.field("stock").props.value, "low-stock");
});

it("advances revision without marking unsaved fields clean on unpublish", async () => {
  const subject = editor(); subject.change("name", "Unsaved title"); subject.change("price", "1250.00");
  const unpublish = subject.action("onUnpublish"); subject.flush(); await settle();
  subject.requests[0].resolve(confirmed({ adminRevision: "9" })); await unpublish;
  assert.equal(subject.baselines.length, 0); assert.equal(subject.field("name").props.value, "Unsaved title"); assert.equal(subject.field("price").props.value, "1250.00");
  const save = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[1].options.body).expectedAdminRevision, "9");
  subject.requests[1].resolve(confirmed({ adminRevision: "10" })); await save;
});

for (const malformed of [null, { ok: true }, confirmed({ adminRevision: 6 }), confirmed({ inventoryRevision: "-1" }), confirmed({ quantity: -1 }), confirmed({ id: "other" })]) {
  it(`requires reload and prevents retries after an unconfirmed response ${JSON.stringify(malformed)}`, async () => {
    const subject = editor(); const save = subject.action("onSave"); subject.flush(); await settle();
    subject.requests[0].resolve(malformed); await save;
    assert.equal(subject.baselines.length, 0); assert.equal(subject.node("fieldset").props.disabled, true);
    assert.ok(subject.button("Reload product"));
    await subject.action("onSave"); assert.equal(subject.requests.length, 1);
  });
}

it("retains editor revision and all edits after an explicit conflict response", async () => {
  const subject = editor(); subject.change("price", "1234.50");
  const save = subject.action("onSave"); subject.flush(); await settle(); subject.requests[0].reject(new Error("Editor conflict. Reload.")); await save;
  assert.equal(subject.field("price").props.value, "1234.50"); assert.equal(subject.baselines.length, 0);
  const retry = subject.action("onSave"); subject.flush(); await settle();
  assert.equal(JSON.parse(subject.requests[1].options.body).expectedAdminRevision, "4");
  subject.requests[1].resolve(confirmed()); await retry;
});

it("hydrates draft collections but discards to live memberships even after saving draft selections, resetting numeric text", async () => {
  const draftCollection = "00000000-0000-0000-0000-000000000001";
  const savedDraftCollection = "00000000-0000-0000-0000-000000000002";
  const draft = { name: "Draft", slug: "synthetic", category: "audio", price: 1300, costPrice: null, images: [], quantity: 99, stockStatus: "in-stock", _collectionIds: [draftCollection] } as ProductDocument;
  const subject = editor({ draft, price: 1200, costPrice: 100 });
  assert.equal(JSON.stringify(subject.node("collections").props.selectedIds), JSON.stringify([draftCollection]));
  assert.equal(subject.field("cost").props.value, "");
  (subject.node("collections").props.onChange as (ids: string[]) => void)([savedDraftCollection]);
  subject.change("price", "1400.00"); const save = subject.action("onSave"); subject.flush(); await settle();
  subject.requests[0].resolve(confirmed()); await save;
  assert.equal(JSON.stringify((subject.baselines.at(-1) as { collectionIds: string[] }).collectionIds), JSON.stringify([savedDraftCollection]));
  subject.change("price", "-"); subject.change("quantity", "1.5");
  const discard = subject.action("onDiscard"); subject.flush(); await settle(); subject.requests[1].resolve(confirmed({ adminRevision: "6" })); await discard;
  assert.equal(JSON.stringify(subject.node("collections").props.selectedIds), '["saved-collection"]');
  assert.equal(subject.field("price").props.value, "1200"); assert.equal(subject.field("cost").props.value, "100"); assert.equal(subject.field("quantity").props.value, "2");
  assert.equal(subject.node("publish").props.dirty, false);
});

it("discards saved draft collections to memberships from the latest successful publication", async () => {
  const subject = editor();
  (subject.node("collections").props.onChange as (ids: string[]) => void)(["published-collection"]);
  const publish = subject.action("onPublish"); subject.flush(); await settle(); subject.requests[0].resolve(confirmed()); await publish;
  (subject.node("collections").props.onChange as (ids: string[]) => void)(["draft-collection"]);
  const save = subject.action("onSave"); subject.flush(); await settle(); subject.requests[1].resolve(confirmed({ adminRevision: "6" })); await save;
  const discard = subject.action("onDiscard"); subject.flush(); await settle(); subject.requests[2].resolve(confirmed({ adminRevision: "7" })); await discard;
  assert.equal(JSON.stringify(subject.node("collections").props.selectedIds), '["published-collection"]');
  assert.equal(subject.node("publish").props.dirty, false);
});

it("blocks existing actions when the initial editor revision is missing", async () => {
  const subject = editor({ adminRevision: undefined });
  const save = subject.action("onSave"); subject.flush(); await save;
  assert.equal(subject.requests.length, 0); assert.ok(subject.button("Reload product"));
});

it("color upload releases pending work at unmount and ignores late completion", async () => {
  const state = hooks(); const signals: boolean[] = []; const changed: unknown[] = [];
  let resolveUpload: (value: unknown) => void = () => {};
  const axesModule = load("../components/admin/variant-axes-fields.tsx", {
    react: state.react, "react/jsx-runtime": { jsx, jsxs: jsx }, "lucide-react": { Plus: "plus", Trash2: "trash" },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" },
    "@/components/admin/admin-fetch": { adminUpload: () => new Promise((resolve) => { resolveUpload = resolve; }) },
    "@/lib/admin-upload-rules": { isAdminUploadUrl }, "@/lib/variant-options-rules": { optionKey: (value: string) => value },
  });
  const root = (axesModule.VariantAxesFields as (props: unknown) => Tree)({ colorEnabled: true, sizeEnabled: false,
    colorOptions: [{ key: "black", name: "Black", enabled: true }], sizeOptions: [], onChange: (value: unknown) => changed.push(value), onBusyChange: (value: boolean) => signals.push(value) });
  const optionList = findAll(root, (node) => typeof node.type === "function")[0];
  const options = (optionList.type as (props: unknown) => Tree)(optionList.props);
  const color = findAll(options, (node) => typeof node.type === "function")[0];
  const tree = state.render(() => (color.type as (props: unknown) => Tree)(color.props));
  const input = findAll(tree, (node) => node.props.type === "file")[0];
  const pending = (input.props.onChange as (event: unknown) => Promise<void>)({ target: { files: [{}] } });
  assert.equal(JSON.stringify(signals), "[true]"); state.unmount();
  resolveUpload({ secureUrl: "https://fixture.test/black.webp" }); await pending;
  assert.equal(JSON.stringify(signals), "[true,false]"); assert.equal(changed.length, 0);
});
