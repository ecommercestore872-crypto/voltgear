import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { adminFormFingerprint } from "./admin-unsaved-rules";

function load<T>(file: URL, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
  });
  return exports as T;
}

it("tracks a new editor from pristine through edits, successful save and reset", () => {
  let saved: { current: string } | undefined;
  let guarded = false;
  const { useAdminFormDirty } = load<typeof import("../components/admin/use-admin-form-dirty")>(
    new URL("../components/admin/use-admin-form-dirty.ts", import.meta.url), {
      react: {
        useMemo: (fn: () => unknown) => fn(),
        useRef: (initial: string) => saved ??= { current: initial },
      },
      "@/lib/admin-unsaved-rules": { adminFormFingerprint },
      "./use-unsaved-changes-guard": { useUnsavedChangesGuard: (dirty: boolean) => { guarded = dirty; } },
    },
  );
  assert.equal(useAdminFormDirty({ title: "" }).dirty, false);
  const edited = useAdminFormDirty({ title: "Unsaved new content" });
  assert.equal(edited.dirty, true);
  assert.equal(guarded, true);
  edited.syncSaved();
  assert.equal(useAdminFormDirty({ title: "Unsaved new content" }).dirty, false);
  const changedAgain = useAdminFormDirty({ title: "Another edit" });
  assert.equal(changedAgain.dirty, true);
  changedAgain.resetSaved({ title: "Restored" });
  assert.equal(useAdminFormDirty({ title: "Restored" }).dirty, false);
});

it("does not disable dirty protection for new product, page/blog or testimonial forms", () => {
  for (const name of ["product-form", "page-form", "testimonial-form"]) {
    const source = readFileSync(new URL(`../components/admin/${name}.tsx`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /useAdminFormDirty\([^;]*,\s*!isNew\s*\)/);
  }
});

it("lets customer load failures reach the existing retryable route boundary instead of an empty-business state", async () => {
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const page = load<{ default: (props: unknown) => Promise<unknown> }>(
    new URL("../../../apps/admin/app/admin/customers/page.tsx", import.meta.url), {
      "react/jsx-runtime": { jsx, jsxs: jsx },
      "next/link": { default: "a" },
      "@/components/ui/button": { Button: "button" },
      "lucide-react": { ChevronLeft: "previous", ChevronRight: "next" },
      "@/lib/db/customer-list": { listAdminCustomersPage: async () => { throw new Error("Fixture DB failure"); } },
    },
  );
  await assert.rejects(page.default({ searchParams: Promise.resolve({}) }), /Fixture DB failure/);
});

it("customer table retains horizontal access rather than clipping columns", () => {
  const source = readFileSync(new URL("../../../apps/admin/app/admin/customers/page.tsx", import.meta.url), "utf8");
  assert.match(source, /overflow-x-auto rounded-xl/);
});
