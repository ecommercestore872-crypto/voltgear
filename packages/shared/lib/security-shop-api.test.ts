import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  SHOP_API_SECURITY_MARKERS,
  shopApiMarkerViolations,
} from "./security-audit-rules";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const shopApiRoot = path.join(repoRoot, "apps/storefront/app/api");

describe("shop API security markers (step 8)", () => {
  for (const [relative, _markers] of Object.entries(SHOP_API_SECURITY_MARKERS)) {
    it(`guards ${relative}`, () => {
      const full = path.join(shopApiRoot, relative);
      assert.equal(existsSync(full), true, `missing ${relative}`);
      const source = readFileSync(full, "utf8");
      const violations = shopApiMarkerViolations(relative, source);
      assert.deepEqual(violations, [], `missing: ${violations.join(", ")}`);
    });
  }

  it("does not expose admin order status on shop", () => {
    const forbidden = path.join(shopApiRoot, "orders", "[orderId]", "status", "route.ts");
    assert.equal(existsSync(forbidden), false);
  });
});
