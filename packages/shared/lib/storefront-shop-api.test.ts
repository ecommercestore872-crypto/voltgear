import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const shopApiRoot = path.join(repoRoot, "apps/storefront/app/api");

/** Admin-only handlers must not ship on buyntryy (voltgear shop). */
const FORBIDDEN_SHOP_API_SUFFIXES = [
  path.join("orders", "[orderId]", "status", "route.ts"),
  path.join("indexnow", "route.ts"),
] as const;

describe("storefront shop API surface (T-41)", () => {
  it("does not deploy admin order status or indexnow routes on the shop", () => {
    for (const suffix of FORBIDDEN_SHOP_API_SUFFIXES) {
      const full = path.join(shopApiRoot, suffix);
      assert.equal(
        existsSync(full),
        false,
        `shop must not include ${suffix}`,
      );
    }
  });
});
