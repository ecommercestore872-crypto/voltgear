import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Node = { type: unknown; props: Record<string, unknown> };
type Slot = { value?: unknown; deps?: unknown[]; cleanup?: () => void };

/** Controlled hook/effect simulation; browser focus/keyboard behavior is tested separately. */
function paletteHarness() {
  const slots: Slot[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  const timers = new Map<number, () => void>();
  const requests: { signal: AbortSignal; resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
  let timerId = 0;
  const exports: Record<string, unknown> = {};
  const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const react = {
    useState(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: initial };
      return [slots[index].value, (next: unknown) => {
        slots[index].value = typeof next === "function" ? next(slots[index].value) : next;
      }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      slots[index] ??= { value: { current: initial } };
      return slots[index].value;
    },
    useId() { cursor++; return "fixture-results"; },
    useEffect(callback: () => (() => void) | undefined, deps: unknown[]) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || !previous.deps?.every((value, i) => Object.is(value, deps[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { deps, cleanup: callback() };
        });
      }
    },
  };
  const dependencies: Record<string, unknown> = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { default: "a" },
    "@radix-ui/react-dialog": { Root: "root", Portal: "portal", Overlay: "overlay", Content: "content", Title: "title", Description: "description", Close: "close" },
    "lucide-react": { X: "x" },
    "@/lib/utils": { cn: (...args: unknown[]) => args.filter(Boolean).join(" ") },
    "@/components/admin/admin-fetch": {
      adminFetch: (_url: string, options: { signal: AbortSignal }) => new Promise((resolve, reject) => {
        requests.push({ signal: options.signal, resolve, reject });
      }),
    },
  };
  runInNewContext(ts.transpileModule(readFileSync(new URL("../components/admin/admin-command-palette.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports, AbortController,
    require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
    window: {
      addEventListener() {}, removeEventListener() {},
      setTimeout(callback: () => void) { timers.set(++timerId, callback); return timerId; },
      clearTimeout(id: number) { timers.delete(id); },
    },
  });
  const component = exports.AdminCommandPalette as (props: unknown) => Node;
  const onOpenChange = () => {};
  function render(open = true): Node {
    cursor = 0;
    const tree = component({ open, onOpenChange, returnFocusTo: { current: null } });
    for (const effect of effects.splice(0)) effect();
    return tree;
  }
  function find(node: unknown, type: string): Node | undefined {
    if (!node || typeof node !== "object") return undefined;
    if (Array.isArray(node)) return node.map((value) => find(value, type)).find(Boolean);
    const tree = node as Node;
    return tree.type === type ? tree : find(tree.props?.children, type);
  }
  function edit(value: string) {
    const input = find(render(), "input")!;
    (input.props.onChange as (event: unknown) => void)({ target: { value } });
    render();
  }
  function fireTimers() {
    const pending = [...timers.values()]; timers.clear();
    for (const timer of pending) timer();
  }
  render(); render();
  return { render, edit, fireTimers, requests, find };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

it("ignores an older search response even when a fake transport ignores abort", async () => {
  const subject = paletteHarness();
  subject.edit("old"); subject.fireTimers();
  subject.edit("new"); subject.fireTimers();
  assert.equal(subject.requests[0].signal.aborted, true);
  subject.requests[1].resolve({ hits: [{ kind: "product", label: "Newest result", href: "/new" }] });
  await settle();
  subject.requests[0].resolve({ hits: [{ kind: "product", label: "Stale result", href: "/old" }] });
  await settle();
  const tree = JSON.stringify(subject.render());
  assert.match(tree, /Newest result/);
  assert.doesNotMatch(tree, /Stale result/);
});

it("aborts search on close and ignores late transport errors", async () => {
  const subject = paletteHarness();
  subject.edit("watch"); subject.fireTimers();
  subject.render(false);
  assert.equal(subject.requests[0].signal.aborted, true);
  subject.requests[0].reject(new Error("Aborted fixture"));
  await settle();
  assert.doesNotMatch(JSON.stringify(subject.render(false)), /Search is unavailable/);
});
