import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDashboardSnapshot,
  isShippedStale,
  orderMatchesStatusFilter,
  productMatchesStockAttention,
  SHIPPED_STALE_DAYS,
} from "./dashboard-rules";

const now = new Date("2026-08-27T12:00:00+05:00");

function order(partial: Record<string, unknown>) {
  return {
    orderId: "VG-1",
    createdAt: "2026-08-27T08:00:00+05:00",
    status: "new",
    total: 1000,
    isDemo: false,
    customer: { name: "Ali" },
    ...partial,
  };
}

function product(partial: Record<string, unknown>) {
  return {
    _id: "p1",
    name: "Watch",
    stockStatus: "in-stock",
    status: "published",
    isDemo: false,
    ...partial,
  };
}

describe("buildDashboardSnapshot", () => {
  it("counts today's live orders and money, skipping cancelled money and demo", () => {
    const snap = buildDashboardSnapshot(
      {
        orders: [
          order({ orderId: "A", total: 1000, status: "new" }),
          order({ orderId: "B", total: 500, status: "cancelled", statusUpdatedAt: "2026-08-27T09:00:00+05:00" }),
          order({ orderId: "C", total: 2000, isDemo: true }),
          order({
            orderId: "D",
            createdAt: "2026-08-26T10:00:00+05:00",
            total: 9999,
            status: "delivered",
          }),
        ],
        products: [],
        reviews: [],
      },
      now
    );
    assert.equal(snap.todayOrderCount, 2);
    assert.equal(snap.todayRevenue, 1000);
    assert.equal(snap.practiceOrderCount, 1);
  });

  it("treats pending as new + processing from any day", () => {
    const snap = buildDashboardSnapshot(
      {
        orders: [
          order({ orderId: "N", status: "new" }),
          order({
            orderId: "P",
            status: "processing",
            createdAt: "2026-08-20T10:00:00+05:00",
          }),
          order({ orderId: "S", status: "shipped" }),
        ],
        products: [],
        reviews: [],
      },
      now
    );
    assert.equal(snap.pendingCount, 2);
    assert.equal(snap.pendingOrders.length, 2);
    assert.equal(snap.shippedWaitingCount, 1);
  });

  it("counts delivered and cancelled by the Karachi day the status was set", () => {
    const snap = buildDashboardSnapshot(
      {
        orders: [
          order({
            orderId: "OLD",
            createdAt: "2026-08-20T10:00:00+05:00",
            status: "delivered",
            statusUpdatedAt: "2026-08-27T01:00:00+05:00",
            total: 100,
          }),
          order({
            orderId: "CX",
            createdAt: "2026-08-20T10:00:00+05:00",
            status: "cancelled",
            statusUpdatedAt: "2026-08-27T02:00:00+05:00",
          }),
          order({
            orderId: "NO",
            status: "delivered",
            statusUpdatedAt: undefined,
          }),
        ],
        products: [],
        reviews: [],
      },
      now
    );
    assert.equal(snap.deliveredTodayCount, 1);
    assert.equal(snap.cancelledTodayCount, 1);
  });

  it("counts published live low and sold-out products, not drafts or demo", () => {
    const snap = buildDashboardSnapshot(
      {
        orders: [],
        products: [
          product({ _id: "a", name: "Low", stockStatus: "low-stock" }),
          product({ _id: "b", name: "Out", stockStatus: "out-of-stock" }),
          product({ _id: "c", name: "Draft", stockStatus: "low-stock", status: "draft" }),
          product({ _id: "d", name: "Demo", stockStatus: "low-stock", isDemo: true }),
        ],
        reviews: [{ status: "pending" }, { status: "approved" }],
      },
      now
    );
    assert.equal(snap.lowStockCount, 2);
    assert.equal(snap.lowStockProducts.length, 2);
    assert.equal(snap.draftProductCount, 1);
    assert.equal(snap.firstDraftProductId, "c");
    assert.equal(snap.pendingReviewCount, 1);
  });
});

describe("orderMatchesStatusFilter", () => {
  it("maps pending to new and processing, ignores unknown", () => {
    assert.equal(orderMatchesStatusFilter("new", "pending"), true);
    assert.equal(orderMatchesStatusFilter("processing", "pending"), true);
    assert.equal(orderMatchesStatusFilter("shipped", "pending"), false);
    assert.equal(orderMatchesStatusFilter("delivered", "delivered"), true);
    assert.equal(orderMatchesStatusFilter("new", "nope"), true);
    assert.equal(orderMatchesStatusFilter("new", null), true);
  });
});

describe("productMatchesStockAttention", () => {
  it("matches low and sold out", () => {
    assert.equal(productMatchesStockAttention("low-stock"), true);
    assert.equal(productMatchesStockAttention("out-of-stock"), true);
    assert.equal(productMatchesStockAttention("in-stock"), false);
  });
});

describe("SHIPPED_STALE_DAYS", () => {
  it("is 3", () => {
    assert.equal(SHIPPED_STALE_DAYS, 3);
  });
});

describe("isShippedStale", () => {
  it("is false when not shipped", () => {
    assert.equal(
      isShippedStale(
        { status: "processing", statusUpdatedAt: "2026-08-20T10:00:00+05:00" },
        now
      ),
      false
    );
  });

  it("is false when shipped less than 3 Karachi days ago", () => {
    assert.equal(
      isShippedStale(
        {
          status: "shipped",
          statusUpdatedAt: "2026-08-25T10:00:00+05:00",
          createdAt: "2026-08-01T10:00:00+05:00",
        },
        now
      ),
      false
    );
  });

  it("is true when shipped 3+ Karachi days ago (uses statusUpdatedAt)", () => {
    assert.equal(
      isShippedStale(
        {
          status: "shipped",
          statusUpdatedAt: "2026-08-24T10:00:00+05:00",
          createdAt: "2026-08-27T08:00:00+05:00",
        },
        now
      ),
      true
    );
  });

  it("falls back to createdAt when statusUpdatedAt missing", () => {
    assert.equal(
      isShippedStale(
        { status: "shipped", createdAt: "2026-08-20T10:00:00+05:00" },
        now
      ),
      true
    );
  });
});

describe("buildDashboardSnapshot COD follow-up", () => {
  it("includes phone on pending orders and lists stale shipped", () => {
    const snap = buildDashboardSnapshot(
      {
        orders: [
          order({
            orderId: "N",
            status: "new",
            customer: { name: "Ali", phone: "03001234567" },
          }),
          order({
            orderId: "FRESH",
            status: "shipped",
            statusUpdatedAt: "2026-08-26T10:00:00+05:00",
          }),
          order({
            orderId: "STALE",
            status: "shipped",
            statusUpdatedAt: "2026-08-20T10:00:00+05:00",
            customer: { name: "Sara", phone: "03007654321" },
          }),
        ],
        products: [],
        reviews: [],
      },
      now
    );
    assert.equal(snap.pendingOrders[0]?.phone, "03001234567");
    assert.equal(snap.shippedWaitingCount, 2);
    assert.equal(snap.shippedStaleOrders.length, 1);
    assert.equal(snap.shippedStaleOrders[0]?.orderId, "STALE");
    assert.equal(snap.shippedStaleOrders[0]?.phone, "03007654321");
    assert.ok((snap.shippedStaleOrders[0]?.daysShipped ?? 0) >= 3);
  });
});
