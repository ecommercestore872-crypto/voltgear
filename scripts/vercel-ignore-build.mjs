#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { shouldBuildVercelProject } from "../packages/shared/lib/vercel-build-scope.mjs";

const target = process.argv[2];
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
// HEAD^ only covers the final commit, not an entire multi-commit push. Without a
// trustworthy previous baseline, rebuilding is safer than silently skipping code.
if (!previousSha || /^0+$/.test(previousSha)) {
  console.log("Vercel build will continue: no previous commit baseline is available.");
  process.exit(1);
}
const result = spawnSync("git", ["diff", "--name-only", previousSha, "HEAD"], {
  encoding: "utf8",
});

if (result.status !== 0) {
  console.log("Vercel build will continue: unable to determine the changed files safely.");
  process.exit(1);
}

const changedFiles = result.stdout.split(/\r?\n/u).filter(Boolean);
const build = shouldBuildVercelProject(target, changedFiles);
console.log(
  build
    ? `Vercel build will continue for ${target}.`
    : `Vercel build will be skipped for ${target}; no relevant files changed.`,
);

// Vercel's Ignore Command contract: 1 builds, 0 skips.
process.exit(build ? 1 : 0);
