import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("admin products pagination constants", () => {
  it("uses a reasonable default page size", async () => {
    const { ADMIN_PRODUCTS_PAGE_SIZE } = await import("@/lib/db/admin-store");
    assert.equal(typeof ADMIN_PRODUCTS_PAGE_SIZE, "number");
    assert.ok(ADMIN_PRODUCTS_PAGE_SIZE >= 24 && ADMIN_PRODUCTS_PAGE_SIZE <= 100);
  });
});
