import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCityPerformance,
  buildCustomerAnalytics,
  buildExecutiveSnapshot,
  buildOrderFunnel,
  buildProductPerformance,
  firstReachedAt,
  parseAnalyticsQuery,
  resolveAnalyticsRange,
  runAnalyticsQuery,
  drillOrdersByIds,
  type AnalyticsOrder,
} from "./analytics-rules";

const noon = (ymd: string) => `${ymd}T07:00:00.000Z`; // morning in Karachi (UTC+5)

function order(partial: Partial<AnalyticsOrder> & Pick<AnalyticsOrder, "orderId" | "createdAt">): AnalyticsOrder {
  return {
    status: "new",
    total: 1000,
    items: [{ slug: "watch", name: "Watch", price: 1000, quantity: 1, lineTotal: 1000 }],
    customer: { email: "a@example.com", city: "Lahore" },
    ...partial,
  };
}

describe("resolveAnalyticsRange", () => {
  it("uses Karachi calendar days for last 7 and this month", () => {
    const now = new Date("2026-08-27T10:00:00+05:00");
    assert.deepEqual(resolveAnalyticsRange("today", now), { start: "2026-08-27", end: "2026-08-27" });
    assert.deepEqual(resolveAnalyticsRange("yesterday", now), { start: "2026-08-26", end: "2026-08-26" });
    assert.deepEqual(resolveAnalyticsRange("last7", now), { start: "2026-08-21", end: "2026-08-27" });
    assert.deepEqual(resolveAnalyticsRange("thisMonth", now), { start: "2026-08-01", end: "2026-08-27" });
  });
});

describe("firstReachedAt", () => {
  it("reads the first history timestamp, not only the current status", () => {
    const o = order({
      orderId: "VG-1",
      createdAt: noon("2026-08-20"),
      status: "delivered",
      statusUpdatedAt: noon("2026-08-27"),
      statusHistory: [
        { status: "new", at: noon("2026-08-20") },
        { status: "shipped", at: noon("2026-08-22") },
        { status: "delivered", at: noon("2026-08-23") },
      ],
    });
    assert.equal(firstReachedAt(o, "delivered")?.slice(0, 10), "2026-08-23");
    assert.equal(firstReachedAt(o, "shipped")?.slice(0, 10), "2026-08-22");
  });
});

describe("buildExecutiveSnapshot", () => {
  const range = { start: "2026-08-27", end: "2026-08-27" };

  it("treats delivered revenue as realized and skips demo and cancelled money", () => {
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-27"),
          status: "delivered",
          statusUpdatedAt: noon("2026-08-27"),
          statusHistory: [{ status: "delivered", at: noon("2026-08-27") }],
          total: 5000,
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-27"),
          status: "cancelled",
          statusUpdatedAt: noon("2026-08-27"),
          statusHistory: [{ status: "cancelled", at: noon("2026-08-27") }],
          total: 2000,
        }),
        order({
          orderId: "VG-DEMO",
          createdAt: noon("2026-08-27"),
          status: "delivered",
          statusUpdatedAt: noon("2026-08-27"),
          statusHistory: [{ status: "delivered", at: noon("2026-08-27") }],
          total: 9999,
          isDemo: true,
        }),
      ],
      range
    );
    assert.equal(snap.ordersPlaced, 2);
    assert.equal(snap.placedRevenue, 7000);
    assert.equal(snap.ordersDelivered, 1);
    assert.equal(snap.deliveredRevenue, 5000);
    assert.equal(snap.ordersCancelled, 1);
    assert.equal(snap.unavailable.visitors, "Not available");
    assert.equal(snap.unavailable.marketing, "Not available");
  });

  it("does not count a delivery on another day as today's delivered revenue", () => {
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-OLD",
          createdAt: noon("2026-08-20"),
          status: "delivered",
          statusUpdatedAt: noon("2026-08-20"),
          statusHistory: [{ status: "delivered", at: noon("2026-08-20") }],
          total: 8000,
        }),
      ],
      range
    );
    assert.equal(snap.ordersPlaced, 0);
    assert.equal(snap.deliveredRevenue, 0);
  });

  it("computes delivered profit from cost when every line has a cost", () => {
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-27"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-27") }],
          total: 5000,
          items: [{ slug: "watch", quantity: 2, lineTotal: 5000 }],
        }),
      ],
      range,
      [{ slug: "watch", costPrice: 1000 }]
    );
    assert.equal(snap.deliveredGrossProfit, 3000);
    assert.equal(snap.profitIncomplete, false);
  });

  it("marks profit unavailable when cost is missing", () => {
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-27"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-27") }],
          total: 5000,
        }),
      ],
      range,
      []
    );
    assert.equal(snap.deliveredGrossProfit, null);
    assert.equal(snap.profitIncomplete, true);
  });

  it("parses postgres timestamps with extra fractional digits", () => {
    const range = { start: "2026-08-26", end: "2026-08-26" };
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-MICRO",
          createdAt: "2026-08-26T16:09:53.906304+00:00",
          status: "processing",
        }),
      ],
      range
    );
    assert.equal(snap.ordersPlaced, 1);
  });

  it("never treats cancelled money as delivered revenue", () => {
    const snap = buildExecutiveSnapshot(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-20"),
          status: "cancelled",
          statusUpdatedAt: noon("2026-08-27"),
          statusHistory: [
            { status: "delivered", at: noon("2026-08-27") },
            { status: "cancelled", at: noon("2026-08-27") },
          ],
          total: 8000,
        }),
      ],
      range
    );
    assert.equal(snap.ordersDelivered, 0);
    assert.equal(snap.deliveredRevenue, 0);
    assert.equal(snap.ordersCancelled, 1);
  });
});

describe("buildProductPerformance", () => {
  it("ranks by delivered revenue from real lines, not fake popularity", () => {
    const range = { start: "2026-08-01", end: "2026-08-27" };
    const rows = buildProductPerformance(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-11") }],
          items: [{ slug: "watch", name: "Watch", quantity: 1, lineTotal: 5000 }],
          total: 5000,
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-10"),
          status: "new",
          items: [{ slug: "bank", name: "Bank", quantity: 9, lineTotal: 900 }],
          total: 900,
        }),
      ],
      range
    );
    assert.equal(rows[0].slug, "watch");
    assert.equal(rows[0].deliveredRevenue, 5000);
    assert.equal(rows[1].slug, "bank");
    assert.equal(rows[1].quantityOrdered, 9);
    assert.equal(rows[1].deliveredRevenue, 0);
  });
});

describe("buildCityPerformance", () => {
  it("groups Lahore and lahore together", () => {
    const range = { start: "2026-08-01", end: "2026-08-27" };
    const rows = buildCityPerformance(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          customer: { email: "a@x.com", city: "Lahore" },
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-11"),
          customer: { email: "b@x.com", city: "lahore" },
        }),
      ],
      range
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ordersPlaced, 2);
    assert.equal(rows[0].city, "Lahore");
  });
});

describe("buildOrderFunnel", () => {
  it("counts history stages among orders placed in range", () => {
    const range = { start: "2026-08-01", end: "2026-08-27" };
    const steps = buildOrderFunnel(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [
            { status: "processing", at: noon("2026-08-10") },
            { status: "shipped", at: noon("2026-08-11") },
            { status: "delivered", at: noon("2026-08-12") },
          ],
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-10"),
          status: "cancelled",
          statusHistory: [{ status: "cancelled", at: noon("2026-08-10") }],
        }),
      ],
      range
    );
    assert.equal(steps[0].count, 2);
    assert.equal(steps[3].count, 1);
    assert.equal(steps[3].label, "Delivered");
  });
});

describe("buildCustomerAnalytics", () => {
  it("does not merge different emails", () => {
    const range = { start: "2026-08-01", end: "2026-08-27" };
    const now = new Date("2026-08-27T12:00:00+05:00");
    const stats = buildCustomerAnalytics(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-01"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-01") }],
          customer: { email: "one@x.com", city: "Lahore" },
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-02"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-02") }],
          customer: { email: "two@x.com", city: "Lahore" },
        }),
      ],
      range,
      now
    );
    assert.equal(stats.firstTime.customers, 2);
    assert.equal(stats.repeat.customers, 0);
  });

  it("merges the same phone when email is missing", () => {
    const range = { start: "2026-08-01", end: "2026-08-27" };
    const now = new Date("2026-08-27T12:00:00+05:00");
    const stats = buildCustomerAnalytics(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-01"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-01") }],
          customer: { phone: "03001234567", city: "Lahore" },
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-20"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-20") }],
          customer: { phone: "+92 300 1234567", city: "Lahore" },
        }),
      ],
      range,
      now
    );
    assert.equal(stats.repeat.customers, 1);
    assert.equal(stats.firstTime.customers, 0);
    assert.equal(stats.skippedNoEmail, 0);
  });
});

describe("parseAnalyticsQuery", () => {
  it("rejects SQL-like or unknown metrics", () => {
    assert.equal(parseAnalyticsQuery({ metric: "deliveredRevenue; drop table", preset: "last30" }).ok, false);
    assert.equal(parseAnalyticsQuery({ metric: "deliveredRevenue", preset: "last30" }).ok, true);
    assert.equal(parseAnalyticsQuery({ metric: "deliveredRevenue", dimension: "source" }).ok, true);
  });
});

describe("runAnalyticsQuery", () => {
  it("returns delivered revenue for the all bucket", () => {
    const rows = runAnalyticsQuery(
      { metric: "deliveredRevenue", preset: "custom", from: "2026-08-27", to: "2026-08-27" },
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-27"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-27") }],
          total: 1500,
        }),
      ],
      []
    );
    assert.equal(rows[0].value, 1500);
    assert.deepEqual(rows[0].orderIds, ["VG-1"]);
  });
});

describe("drillOrdersByIds", () => {
  it("returns order number, city, and total without email or phone", () => {
    const rows = drillOrdersByIds(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-27"),
          customer: { email: "secret@x.com", city: "Karachi" },
          total: 2200,
        }),
      ],
      ["VG-1"]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].orderId, "VG-1");
    assert.equal(rows[0].city, "Karachi");
    assert.equal(rows[0].total, 2200);
    assert.equal("email" in rows[0], false);
    assert.equal("phone" in rows[0], false);
    assert.equal(JSON.stringify(rows[0]).includes("secret@x.com"), false);
  });
});
