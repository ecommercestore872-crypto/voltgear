import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_ORDERS_PAGE_SIZE,
  adminOrderSearchPattern,
  adminOrdersRange,
  adminOrdersStatusForTab,
  normalizeAdminOrdersPage,
  sanitizeAdminOrderSearchTerm,
} from "./admin-orders-rules";

describe("admin-orders-rules", () => {
  it("sanitizes search terms", () => {
    assert.equal(sanitizeAdminOrderSearchTerm("  %ab%  "), "ab");
  });

  it("builds ilike pattern when long enough", () => {
    assert.equal(adminOrderSearchPattern("a"), null);
    assert.equal(adminOrderSearchPattern("vg"), "%vg%");
  });

  it("normalizes page numbers", () => {
    assert.equal(normalizeAdminOrdersPage("2"), 2);
    assert.equal(normalizeAdminOrdersPage("0"), 1);
    assert.equal(normalizeAdminOrdersPage(undefined), 1);
  });

  it("computes supabase range", () => {
    assert.deepEqual(adminOrdersRange(1, 50), { from: 0, to: 49 });
    assert.deepEqual(adminOrdersRange(2, 50), { from: 50, to: 99 });
    assert.equal(ADMIN_ORDERS_PAGE_SIZE, 50);
  });

  it("maps tabs to status filters", () => {
    assert.equal(adminOrdersStatusForTab("all"), null);
    assert.equal(adminOrdersStatusForTab("shipped"), "shipped");
    assert.equal(adminOrdersStatusForTab("bogus"), null);
  });
});
