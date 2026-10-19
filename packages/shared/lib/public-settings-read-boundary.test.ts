import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const storePath = resolve(
  process.cwd(),
  "packages/shared/lib/db/store-chrome-store.ts",
);

describe("public settings read boundary", () => {
  it("does not import or call administrative settings writers", () => {
    const source = readFileSync(storePath, "utf8");

    assert.doesNotMatch(source, /from ["']@\/lib\/db\/admin-store["']/);
    assert.doesNotMatch(source, /\bensureShopperBrandSettings\b/);
    assert.match(source, /\.from\(["']site_settings["']\)\s*\.select\(["']\*["']\)/);
  });
});
