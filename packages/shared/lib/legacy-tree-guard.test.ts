import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const LEGACY_SHELL_FILES = [
  "components/layout/app-chrome.tsx",
  "components/cart/cart-drawer.tsx",
  "components/gadget/gadget-shop-catalog-client.tsx",
] as const;

describe("legacy root components tree", () => {
  it("must not reintroduce useSearchParams in shell copies (if tree still exists)", () => {
    for (const rel of LEGACY_SHELL_FILES) {
      const path = join(repoRoot, rel);
      if (!existsSync(path)) continue;
      const src = readFileSync(path, "utf8");
      assert.doesNotMatch(
        src,
        /useSearchParams/,
        `${rel} still uses useSearchParams — sync from packages/shared or remove legacy tree`,
      );
    }
  });
});
