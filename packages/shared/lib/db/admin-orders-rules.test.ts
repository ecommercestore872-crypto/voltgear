import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_ORDERS_PAGE_SIZE,
  adminOrderSearchPattern,
  adminOrdersRange,
  adminOrdersIsArchivedTab,
  adminOrdersStatusForTab,
  adminOrdersRangeCutoff,
  normalizeAdminOrdersRange,
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
    assert.equal(adminOrdersStatusForTab("archived"), null);
    assert.equal(adminOrdersStatusForTab("open"), null);
    assert.equal(adminOrdersStatusForTab("attention"), null);
    assert.equal(adminOrdersIsArchivedTab("archived"), true);
    assert.equal(adminOrdersIsArchivedTab("all"), false);
  });

  it("normalizes range, defaulting to 30d", () => {
    assert.equal(normalizeAdminOrdersRange(undefined), "30d");
    assert.equal(normalizeAdminOrdersRange("bogus"), "30d");
    assert.equal(normalizeAdminOrdersRange("7d"), "7d");
    assert.equal(normalizeAdminOrdersRange("90d"), "90d");
    assert.equal(normalizeAdminOrdersRange("all"), "all");
  });

  it("computes range cutoff", () => {
    const now = new Date("2026-11-25T12:00:00.000Z");
    assert.equal(adminOrdersRangeCutoff("7d", now), "2026-11-18T12:00:00.000Z");
    assert.equal(adminOrdersRangeCutoff("30d", now), "2026-10-26T12:00:00.000Z");
    assert.equal(adminOrdersRangeCutoff("90d", now), "2026-08-27T12:00:00.000Z");
    assert.equal(adminOrdersRangeCutoff("all", now), null);
  });
});
