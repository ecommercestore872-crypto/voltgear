import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { it } from "node:test";
import ts from "typescript";

const script = ts.transpileModule(readFileSync(new URL("../../../scripts/vercel-ignore-build.mjs", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true },
  fileName: "vercel-ignore-build.ts",
}).outputText;
const scope = ts.transpileModule(readFileSync(new URL("./vercel-build-scope.mjs", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true },
  fileName: "vercel-build-scope.ts",
}).outputText;
const scopeExports: Record<string, unknown> = {};
runInNewContext(scope, { exports: scopeExports });

function execute(previousSha: string | undefined, output = "docs/report.md\n", status = 0, target = "admin") {
  const calls: unknown[][] = [];
  const logs: string[] = [];
  let exitCode: number | undefined;
  const stopped = new Error("controlled process exit");
  try {
    runInNewContext(script, {
      exports: {},
      require: (name: string) => {
        if (name === "node:child_process") return {
          spawnSync: (...args: unknown[]) => { calls.push(args); return { status, stdout: output }; },
        };
        if (name === "../packages/shared/lib/vercel-build-scope.mjs") return scopeExports;
        throw new Error(`Unexpected dependency: ${name}`);
      },
      process: {
        argv: ["node", "script", target], env: { VERCEL_GIT_PREVIOUS_SHA: previousSha },
        exit(code: number) { exitCode = code; throw stopped; },
      },
      console: { log(message: string) { logs.push(message); } },
    });
  } catch (error) { if (error !== stopped) throw error; }
  return { exitCode, calls, logs };
}

it("builds without a previous baseline even if HEAD^ would contain documentation only", () => {
  for (const missing of [undefined, "", "  ", "0000000000000000000000000000000000000000"]) {
    const result = execute(missing);
    assert.equal(result.exitCode, 1);
    assert.equal(result.calls.length, 0, "must not infer a baseline from the last commit");
  }
});

it("compares the supplied baseline through HEAD so earlier source commits are included", () => {
  const result = execute("  baseline  ", "packages/shared/components/admin/inbox-list.tsx\ndocs/report.md\n");
  assert.equal(result.exitCode, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(result.calls[0].slice(0, 2))),
    ["git", ["diff", "--name-only", "baseline", "HEAD"]]);
});

it("still skips a verified docs-only range or the other isolated app", () => {
  assert.equal(execute("baseline").exitCode, 0);
  assert.equal(execute("baseline", "apps/storefront/app/page.tsx\n").exitCode, 0);
  assert.equal(execute("baseline", "apps/admin/app/page.tsx\n", 0, "storefront").exitCode, 0);
});

it("continues builds when the diff fails, the range is empty or the target is unknown", () => {
  assert.equal(execute("unavailable", "", 128).exitCode, 1);
  assert.equal(execute("baseline", "").exitCode, 1);
  assert.equal(execute("baseline", "docs/report.md\n", 0, "unknown").exitCode, 1);
});
