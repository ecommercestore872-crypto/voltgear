import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { it } from "node:test";
import ts from "typescript";
import { buildProductActionRequest } from "./admin-product-action-rules";
import { productDocumentFromAdmin } from "./admin-product-form-rules";
import { portableTextToPlain, slugify, textToPortableText } from "./db/publish";
import { isAdminUploadUrl } from "./admin-upload-rules";

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
    exports, URL,
    require(name: string) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
    ...globals,
  });
  return exports;
}
type RequestRecord = { path: string; options: { body: string }; resolve: (value: unknown) => void; reject: (error: Error) => void };
function editor() {
  const state = hooks();
  const requests: RequestRecord[] = [];
  const timers: (() => void)[] = [];
  const baselines: unknown[] = [];
  let dynamicIndex = 0;
  const dependencies: Record<string, unknown> = {
    react: state.react, "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/dynamic": { default: () => ++dynamicIndex === 1 ? "media" : "axes" },
    "next/link": { default: "link" },
    "next/navigation": { useRouter: () => ({ replace() {} }) },
    "@/components/admin/string-array-input": { StringArrayInput: "strings" },
    "@/components/admin/object-array-input": { ObjectArrayInput: "objects" },
    "@/components/admin/publish-bar": { PublishBar: "publish" },
    "@/components/admin/admin-sticky-publish-bar": { AdminStickyPublishBar: "sticky" },
    "@/components/admin/use-admin-form-dirty": { useAdminFormDirty: () => ({ dirty: true, resetSaved: (value: unknown) => baselines.push(value) }) },
    "@/components/admin/product-collections-fields": { ProductCollectionsFields: "collections" },
    "@/components/admin/admin-fetch": {
      AdminAuthError: class extends Error {},
      adminFetch: (path: string, options: { body: string }) => new Promise((resolve, reject) => requests.push({ path, options, resolve, reject })),
    },
    "@/lib/admin-product-action-rules": { buildProductActionRequest },
    "@/lib/admin-product-form-rules": { productDocumentFromAdmin },
    "@/lib/db/publish": { portableTextToPlain, slugify, textToPortableText },
    "@/lib/product-image": { PRODUCT_PHOTO_HINT: "Synthetic" },
  };
  for (const [file, name, tag] of [["button", "Button", "button"], ["input", "Input", "input"], ["label", "Label", "label"], ["textarea", "Textarea", "textarea"], ["badge", "Badge", "badge"]]) {
    dependencies[`@/components/ui/${file}`] = { [name]: tag };
  }
  const module = load("../components/admin/product-form.tsx", dependencies, { setTimeout: (callback: () => void) => timers.push(callback), confirm: () => true });
  const component = module.ProductForm as (props: unknown) => Tree;
  const product = { _id: "fixture", name: "Synthetic", slug: "synthetic", category: "audio", price: 1200,
    stockStatus: "in-stock", quantity: 2, images: [], status: "published", draft: null, addons: [{ name: "Case", price: 10 }] };
  function render() { return state.render(() => component({ product, shopTypes: [{ slug: "audio" }], collectionIds: ["saved-collection"] })); }
  function node(type: string) { return findAll(render(), (tree) => tree.type === type)[0]; }
  return {
    render, node, requests, baselines,
    async action(name: string) { return (node("publish").props[name] as () => Promise<void>)(); },
    flush() { timers.splice(0).forEach((resolve) => resolve()); },
    busy(value: boolean) { (node("media").props.onBusyChange as (value: boolean) => void)(value); },
  };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

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
  subject.requests[1].resolve({ ok: true }); await retry;
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
  subject.requests[0].resolve({ ok: true }); await retry;
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
  subject.requests[0].resolve({ ok: true }); await operation;
  assert.equal(subject.baselines.length, 0);
});

it("discards unsaved memberships and restores the editor's most recently published document", async () => {
  const subject = editor();
  const nameInput = findAll(subject.render(), (node) => node.props.id === "name")[0];
  (nameInput.props.onChange as (event: unknown) => void)({ target: { value: "New published title" } });
  const publish = subject.action("onPublish"); subject.flush(); await settle();
  subject.requests[0].resolve({ ok: true }); await publish;
  (subject.node("collections").props.onChange as (ids: string[]) => void)(["unsaved-collection"]);
  const discard = subject.action("onDiscard"); subject.flush(); await settle();
  subject.requests[1].resolve({ ok: true }); await discard;
  const input = findAll(subject.render(), (node) => node.props.id === "name")[0];
  assert.equal(input.props.value, "New published title");
  assert.equal(JSON.stringify(subject.node("collections").props.selectedIds), '["saved-collection"]');
});

it("color upload releases pending work at unmount and ignores late completion", async () => {
  const state = hooks(); const signals: boolean[] = []; const changed: unknown[] = [];
  let resolveUpload: (value: unknown) => void = () => {};
  const module = load("../components/admin/variant-axes-fields.tsx", {
    react: state.react, "react/jsx-runtime": { jsx, jsxs: jsx }, "lucide-react": { Plus: "plus", Trash2: "trash" },
    "@/components/ui/button": { Button: "button" }, "@/components/ui/input": { Input: "input" }, "@/components/ui/label": { Label: "label" },
    "@/components/admin/admin-fetch": { adminUpload: () => new Promise((resolve) => { resolveUpload = resolve; }) },
    "@/lib/admin-upload-rules": { isAdminUploadUrl }, "@/lib/variant-options-rules": { optionKey: (value: string) => value },
  });
  const root = (module.VariantAxesFields as (props: unknown) => Tree)({ colorEnabled: true, sizeEnabled: false,
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
