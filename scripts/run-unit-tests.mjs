#!/usr/bin/env node
/**
 * Discover unit tests from the working tree so new regression tests run before
 * they are staged. CI still sees the same deterministic repository directory.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

function findTests(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...findTests(absolute));
    else if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.mjs")) {
      found.push(relative(process.cwd(), absolute));
    }
  }
  return found;
}

const testRoots = [
  join(process.cwd(), "packages", "shared", "lib"),
  join(process.cwd(), "apps", "storefront", "app"),
  join(process.cwd(), "apps", "admin", "app"),
];
const files = testRoots.flatMap(findTests).sort();

if (!files.length) {
  console.error("No test files found.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-isolation=none", "--test-concurrency=1", ...files],
  // Bypass cmd.exe's ~8 KB command limit on Windows as the test suite grows.
  // Separate arguments also preserve spaces/metacharacters without shell parsing.
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
