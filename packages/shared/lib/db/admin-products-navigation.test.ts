import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Props = Parameters<typeof import("../../components/admin/product-list").ProductList>[0];
type Element = { type: unknown; props: Record<string, unknown> };
const source = readFileSync(path.resolve(import.meta.dirname, "../../components/admin/product-list.tsx"), "utf8");

/** Exercise the component's handlers/effects without a browser or external service. */
function productList(initial: Partial<Props> = {}) {
  const slots: { value?: unknown; deps?: unknown[]; cleanup?: () => void }[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let timerId = 0;
  const timers = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  const navigations: string[] = [];
  let props: Props = {
    products: [], shopTypes: [], serverQuery: "watch", serverCategory: "watches",
    stockFilter: "attention", page: 2, pageSize: 48, totalCount: 180,
    categoryCounts: [{ slug: "watches", count: 180 }, { slug: "audio", count: 10 }],
    ...initial,
  };
  const slot = () => slots[cursor++] ?? (slots[cursor - 1] = {});
  const changed = (before: unknown[] | undefined, after: unknown[]) =>
    !before || before.length !== after.length || before.some((value, index) => !Object.is(value, after[index]));
  const memoValue = (factory: () => unknown, deps: unknown[]) => {
    const state = slot();
    if (changed(state.deps, deps)) { state.value = factory(); state.deps = deps; }
    return state.value;
  };
  const jsx = (type: unknown, elementProps: Record<string, unknown>) => ({ type, props: elementProps });
  const exports: {
    ProductList?: (value: Props) => Element;
    adminProductsHref?: (value: { q?: string; stock?: string; category?: string; page?: number }) => string;
  } = {};
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: "product-list.tsx",
  }).outputText, {
    exports, URLSearchParams,
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    window: {
      addEventListener: (event: string, callback: () => void) => listeners.set(event, callback),
      removeEventListener: (event: string) => listeners.delete(event),
    },
    require: (name: string) => {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react") return {
        useState: (initialValue: unknown) => {
          const state = slot();
          if (!Object.hasOwn(state, "value")) state.value = initialValue;
          return [state.value, (value: unknown) => { state.value = value; }];
        },
        useRef: (value: unknown) => {
          const state = slot();
          if (!state.value) state.value = { current: value };
          return state.value;
        },
        useMemo: memoValue,
        useCallback: (callback: () => unknown, deps: unknown[]) => memoValue(() => callback, deps),
        useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
          const state = slot();
          if (changed(state.deps, deps)) {
            state.deps = deps;
            effects.push(() => { state.cleanup?.(); state.cleanup = effect(); });
          }
        },
      };
      if (name === "next/link") return { __esModule: true, default: "Link" };
      if (name === "next/navigation") return { useRouter: () => ({ replace: (href: string) => navigations.push(href) }) };
      if (name === "@/components/ui/button") return { Button: "Button" };
      if (name === "@/components/ui/input") return { Input: "Input" };
      if (name === "@/components/ui/badge") return { Badge: "Badge" };
      if (name === "@/lib/utils") return { formatPrice: String };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return {
    render(next: Partial<Props> = {}) {
      props = { ...props, ...next };
      cursor = 0;
      effects = [];
      const tree = exports.ProductList!(props);
      for (const effect of effects) effect();
      return tree;
    },
    href: exports.adminProductsHref!,
    navigations,
    runTimers() {
      const pending = [...timers.values()]; timers.clear();
      for (const callback of pending) callback();
    },
    popState: () => listeners.get("popstate")?.(),
  };
}

function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const element = value as Element;
  return [element, ...elements(element.props.children)];
}

function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join("");
  if (value && typeof value === "object" && "props" in value) return text((value as Element).props.children);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function input(tree: Element) {
  return elements(tree).find((element) => element.type === "Input")!;
}

function click(tree: Element, label: string) {
  const button = elements(tree).find((element) => element.type === "Button" && text(element).trim() === label);
  assert.ok(button, `Button ${label} should be rendered`);
  (button.props.onClick as () => void)();
}

function edit(tree: Element, value: string) {
  (input(tree).props.onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}

function params(href: string) {
  return Object.fromEntries(new URL(href, "https://admin.example").searchParams);
}

describe("product list URL and navigation contracts", () => {
  it("keeps search, stock, category and page together in links", () => {
    const subject = productList();
    assert.deepEqual(params(subject.href({ q: " watch ", stock: "attention", category: "watches", page: 3 })), {
      q: "watch", stock: "attention", category: "watches", page: "3",
    });
    assert.equal(subject.href({ q: "w", stock: "", category: "all", page: 1 }), "/admin/products");
    click(subject.render(), "Next");
    assert.deepEqual(params(subject.navigations[0]), { q: "watch", stock: "attention", category: "watches", page: "3" });
  });

  it("resets the page for search and carries the active category and stock filter", () => {
    const subject = productList();
    edit(subject.render(), "watch band");
    subject.runTimers();
    assert.deepEqual(params(subject.navigations[0]), { q: "watch band", category: "watches", stock: "attention" });
  });

  it("category changes retain the current search and cancel its pending debounce", () => {
    const subject = productList();
    edit(subject.render(), "wireless");
    click(subject.render(), "audio10");
    subject.runTimers();
    assert.equal(subject.navigations.length, 1);
    assert.deepEqual(params(subject.navigations[0]), { q: "wireless", category: "audio", stock: "attention" });
  });

  it("clears every filter together without a stale search navigating afterward", () => {
    const subject = productList();
    edit(subject.render(), "wireless");
    click(subject.render(), "Clear filters");
    subject.runTimers();
    assert.deepEqual(subject.navigations, ["/admin/products"]);
    assert.equal(input(subject.render()).props.value, "");
  });

  it("uses external URL state and cancels a search pending during browser Back", () => {
    const subject = productList();
    edit(subject.render(), "wireless");
    subject.popState();
    subject.render({ serverQuery: "", serverCategory: undefined, stockFilter: undefined, page: 1 });
    subject.runTimers();
    assert.equal(input(subject.render()).props.value, "");
    assert.deepEqual(subject.navigations, []);
  });

  it("does not let an older search response erase a newer edit or cancel its debounce", () => {
    const subject = productList();
    edit(subject.render(), "speaker");
    subject.runTimers();
    edit(subject.render(), "speaker cable");
    subject.render({ serverQuery: "speaker", page: 1 });
    assert.equal(input(subject.render()).props.value, "speaker cable");
    subject.runTimers();
    assert.equal(params(subject.navigations.at(-1)!).q, "speaker cable");
  });

  it("shows the exact matching total and names only supported search fields", () => {
    const subject = productList();
    const tree = subject.render();
    assert.ok(text(tree).includes("180 products needing stock attention in watches matching \"watch\""));
    assert.equal(input(tree).props.placeholder, "Search name, slug, or category (2+ characters)");
    assert.equal(text(tree).includes("max 500"), false);
  });
});
