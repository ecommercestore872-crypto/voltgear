import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Tree = { type: unknown; props: {
  [key: string]: unknown;
  onChange: (event: unknown) => Promise<void> | void;
  onClick: () => void;
  onBlur: () => void;
} };
type Slot = { value?: unknown; cleanup?: () => void; effect?: boolean };

// Run the actual TSX component with controlled hooks/transport; no providers or DOM writes.
function mediaHarness(initial = ["https://res.cloudinary.com/fixture/a.jpg", "/images/b.jpg"]) {
  const slots: Slot[] = [];
  let cursor = 0;
  let unmounted = false;
  let writesAfterUnmount = 0;
  let urls = initial;
  let disabled = false;
  let onChange = (next: string[]) => { urls = Array.from(next); changes.push(urls); };
  const changes: string[][] = [];
  const busy: boolean[] = [];
  const requests: { resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
  const effects: (() => void)[] = [];
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const dependencies: Record<string, unknown> = {
    react: {
      useState(initial: unknown) {
        const index = cursor++;
        slots[index] ??= { value: initial };
        return [slots[index].value, (value: unknown) => {
          if (unmounted) writesAfterUnmount++;
          slots[index].value = typeof value === "function" ? value(slots[index].value) : value;
        }];
      },
      useRef(initial: unknown) {
        const index = cursor++;
        slots[index] ??= { value: { current: initial } };
        return slots[index].value;
      },
      useEffect(callback: () => (() => void) | undefined) {
        const index = cursor++;
        if (!slots[index]?.effect) effects.push(() => { slots[index] = { effect: true, cleanup: callback() }; });
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": { ArrowDown: "down", ArrowUp: "up", Plus: "plus", Trash2: "trash", Upload: "upload", Loader2: "loader" },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/input": { Input: "paste" },
    "@/components/ui/label": { Label: "label" },
    "@/lib/product-image": { isProductImageTooSmall: () => false },
    "./admin-fetch": {
      adminUpload: () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
      adminFetch: () => { throw new Error("No API calls permitted from media removal"); },
    },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL("../components/admin/media-field.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, URL, Error,
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
  });
  function render(): Tree {
    cursor = 0;
    const component = exports.MediaField as (props: unknown) => Tree;
    const tree = component({ label: "Images", urls, onChange, onBusyChange: (value: boolean) => busy.push(value), disabled });
    for (const effect of effects.splice(0)) effect();
    return tree;
  }
  function all(node: unknown, predicate: (node: Tree) => boolean): Tree[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap((item) => all(item, predicate));
    const tree = node as Tree;
    return [...(predicate(tree) ? [tree] : []), ...all(tree.props?.children, predicate)];
  }
  function find(predicate: (node: Tree) => boolean) { return all(render(), predicate)[0]; }
  function click(label: string, index = 0) {
    all(render(), (node) => node.props?.["aria-label"] === label)[index].props.onClick();
  }
  function paste(value: string) {
    const input = find((node) => node.type === "paste");
    input.props.onChange({ target: { value } });
    // Both events can happen before React delivers another controlled props update.
    input.props.onBlur();
    find((node) => node.type === "button" && Array.isArray(node.props.children) && node.props.children.includes("Add")).props.onClick();
  }
  function upload() {
    return find((node) => node.type === "input" && node.props.type === "file").props.onChange({ target: { files: [{}] } });
  }
  render();
  return {
    render, find, all, click, paste, upload, requests, changes, busy,
    get urls() { return urls; },
    setDisabled(value: boolean) { disabled = value; render(); },
    replaceOnChange(callback: (value: string[]) => void) { onChange = callback; render(); },
    unmount() { unmounted = true; for (const slot of slots) slot.cleanup?.(); },
    get writesAfterUnmount() { return writesAfterUnmount; },
  };
}

it("unlinks managed images without calling the destructive upload API", () => {
  const subject = mediaHarness();
  subject.click("Remove");
  assert.deepEqual(subject.urls, ["/images/b.jpg"]);
  subject.paste("https://fixture.supabase.co/storage/v1/object/public/product-images/shared.jpg");
  subject.click("Remove", 1);
  assert.deepEqual(subject.urls, ["/images/b.jpg"]);
});

it("preserves paste, reorder and removal edits made during an upload", async () => {
  const subject = mediaHarness();
  const upload = subject.upload();
  subject.paste("https://fixture.test/c.jpg");
  assert.equal(subject.urls.length, 3, "blur plus Add must not append twice");
  subject.click("Move up", 2);
  subject.click("Remove", 0);
  subject.requests[0].resolve({ secureUrl: "https://fixture.test/upload.jpg" });
  await upload;
  assert.deepEqual(subject.urls, ["https://fixture.test/c.jpg", "/images/b.jpg", "https://fixture.test/upload.jpg"]);
  assert.deepEqual(subject.busy, [true, false]);
});

it("uses the latest parent change callback when deferred upload completes", async () => {
  const subject = mediaHarness();
  const upload = subject.upload();
  let received: string[] = [];
  subject.replaceOnChange((value) => { received = Array.from(value); });
  subject.requests[0].resolve({ secureUrl: "/images/upload.jpg" });
  await upload;
  assert.equal(subject.changes.length, 0);
  assert.equal(received.at(-1), "/images/upload.jpg");
});

it("blocks upload reentry and disables all edits while the parent is saving", async () => {
  const subject = mediaHarness();
  subject.setDisabled(true);
  await subject.upload();
  subject.paste("https://fixture.test/c.jpg");
  subject.click("Remove");
  subject.click("Move down");
  assert.equal(subject.requests.length, 0);
  assert.equal(subject.changes.length, 0);
  const controls = subject.all(subject.render(), (node) => ["button", "input", "paste"].includes(String(node.type)));
  assert.ok(controls.every((node) => node.props.disabled === true));
  subject.setDisabled(false);
  const upload = subject.upload();
  await subject.upload();
  assert.equal(subject.requests.length, 1);
  subject.requests[0].resolve({ secureUrl: "https://fixture.test/upload.jpg" });
  await upload;
  assert.deepEqual(subject.busy, [true, false]);
});

it("rejects malformed upload responses without appending undefined or unsafe URLs", async () => {
  for (const response of [null, {}, { secureUrl: undefined }, { secureUrl: 42 }, { secureUrl: " " }, { secureUrl: "javascript:alert(1)" }, { secureUrl: "//evil.test/img" }, { secureUrl: "https://user:pass@fixture.test/image" }]) {
    const subject = mediaHarness();
    const upload = subject.upload();
    subject.requests[0].resolve(response);
    await upload;
    assert.equal(subject.changes.length, 0);
    assert.match(String(subject.find((node) => node.props.role === "alert").props.children), /valid media URL/);
    assert.deepEqual(subject.busy, [true, false]);
  }
});

it("surfaces upload rejection and permits a fresh retry", async () => {
  const subject = mediaHarness();
  const first = subject.upload();
  subject.requests[0].reject(new Error("Fixture unavailable"));
  await first;
  assert.equal(subject.find((node) => node.props.role === "alert").props.children, "Fixture unavailable");
  const retry = subject.upload();
  subject.requests[1].resolve({ secureUrl: "https://fixture.test/retry.jpg" });
  await retry;
  assert.equal(subject.urls.at(-1), "https://fixture.test/retry.jpg");
  assert.deepEqual(subject.busy, [true, false, true, false]);
});

it("balances busy once at unmount and ignores late success or error", async () => {
  for (const rejected of [false, true]) {
    const subject = mediaHarness();
    const upload = subject.upload();
    subject.unmount();
    assert.deepEqual(subject.busy, [true, false]);
    if (rejected) subject.requests[0].reject(new Error("Late failure"));
    else subject.requests[0].resolve({ secureUrl: "https://fixture.test/late.jpg" });
    await upload;
    assert.equal(subject.changes.length, 0);
    assert.equal(subject.writesAfterUnmount, 0);
    assert.deepEqual(subject.busy, [true, false]);
  }
});

it("keeps existing legacy URLs removable while validating newly pasted links", () => {
  const subject = mediaHarness(["http://legacy.example/image.jpg"]);
  subject.paste("data:image/svg+xml,unsafe");
  assert.equal(subject.changes.length, 0);
  assert.ok(subject.find((node) => node.props.role === "alert"));
  subject.click("Remove");
  subject.paste(" /images/safe.jpg ");
  assert.deepEqual(subject.urls, ["/images/safe.jpg"]);
});
