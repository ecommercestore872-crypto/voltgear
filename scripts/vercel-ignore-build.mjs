#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { shouldBuildVercelProject } from "../packages/shared/lib/vercel-build-scope.mjs";

const target = process.argv[2];
const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA?.trim();
const base = previousSha && !/^0+$/.test(previousSha) ? previousSha : "HEAD^";
const result = spawnSync("git", ["diff", "--name-only", base, "HEAD"], {
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
