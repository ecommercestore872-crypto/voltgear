#!/usr/bin/env node
/**
 * Run only git-tracked unit tests (CI-safe — no missing local-only files).
 */
import { spawnSync } from "node:child_process";
import { execSync } from "node:child_process";

const files = execSync(
  'git ls-files "packages/shared/lib/**/*.test.ts" "packages/shared/lib/**/*.test.mjs"',
  { encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

if (!files.length) {
  console.error("No test files found.");
  process.exit(1);
}

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", "--test", ...files],
  { stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
