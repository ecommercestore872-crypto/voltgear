import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const script = ts.transpileModule(readFileSync(new URL("../../../scripts/run-unit-tests.mjs", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, allowJs: true },
  fileName: "run-unit-tests.ts",
}).outputText;

function execute({ status = 0, empty = false, large = false }: { status?: number | null; empty?: boolean; large?: boolean } = {}) {
  const root = path.resolve("fixture repo with (spaces)");
  const lib = path.join(root, "packages/shared/lib");
  const executable = path.join(root, "runtime with spaces/node.exe");
  const calls: unknown[][] = [];
  const directories = new Map<string, [string, boolean][]>([
    [lib, empty ? [] : large ? Array.from({ length: 300 }, (_, i) => [`regression-${i.toString().padStart(4, "0")}-long-name.test.ts`, false]) : [
      ["z.test.ts", false], ["ignored.ts", false], ["nested dir", true],
    ]],
    [path.join(lib, "nested dir"), [["a & b.test.mjs", false]]],
    [path.join(root, "apps/storefront/app"), []],
    [path.join(root, "apps/admin/app"), []],
  ]);
  let exitCode: number | undefined;
  const stopped = new Error("controlled process exit");
  try {
    runInNewContext(script, {
      exports: {},
      require(name: string) {
        if (name === "node:path") return path;
        if (name === "node:fs") return { readdirSync(directory: string) {
          if (!directories.has(directory)) throw new Error(`Unexpected directory ${directory}`);
          return directories.get(directory)!.map(([name, directory]) => ({ name, isDirectory: () => directory }));
        } };
        if (name === "node:child_process") return { spawnSync: (...args: unknown[]) => { calls.push(args); return { status }; } };
        throw new Error(`Unexpected dependency ${name}`);
      },
      process: { execPath: executable, cwd: () => root, exit(code: number) { exitCode = code; throw stopped; } },
      console: { error() {} },
    });
  } catch (error) { if (error !== stopped) throw error; }
  return { calls, exitCode, executable };
}

it("runs discovered tests through the current Node runtime without a command shell", () => {
  const result = execute();
  assert.equal(result.exitCode, 0);
  assert.equal(result.calls.length, 1);
  const [executable, rawArgs, rawOptions] = result.calls[0];
  assert.equal(executable, result.executable);
  const args = rawArgs as string[];
  assert.deepEqual(Array.from(args.slice(0, 5)), ["--import", "tsx", "--test", "--test-isolation=none", "--test-concurrency=1"]);
  assert.deepEqual(Array.from(args.slice(5)), [path.join("packages/shared/lib/nested dir/a & b.test.mjs"), path.join("packages/shared/lib/z.test.ts")]);
  assert.equal((rawOptions as { shell?: boolean }).shell, undefined);
});

it("does not route growing test arguments through the Windows 8 KB shell boundary", () => {
  const result = execute({ large: true });
  const args = result.calls[0][1] as string[];
  assert.ok(args.join(" ").length > 8191);
  assert.equal(args.length, 305);
  assert.equal(result.exitCode, 0);
});

it("fails rather than succeeding when no tests are discovered", () => {
  const result = execute({ empty: true });
  assert.equal(result.exitCode, 1);
  assert.equal(result.calls.length, 0);
});

it("propagates a failing test process exit status", () => {
  assert.equal(execute({ status: 2 }).exitCode, 2);
});

it("fails closed when the child process could not start", () => {
  assert.equal(execute({ status: null }).exitCode, 1);
});
