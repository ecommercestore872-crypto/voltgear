import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AnalyticsOrder, ProductCostRow } from "./analytics-rules";
import type { TrafficEvent, TrafficSession } from "./analytics-traffic-rules";
import {
  adSpendRangeKey,
  buildCheckoutFieldFailures,
  buildFulfillmentHours,
  buildMissingCosts,
  buildMoneyStory,
  buildPeriodComparison,
  buildProductConversion,
  buildProfitAlerts,
  buildRtoProxy,
  buildSourceMoney,
  computeRoas,
  parseAdSpendStore,
  priorYmdRange,
  rowsToCsv,
  spendForRange,
  upsertAdSpend,
  upsertUnitFees,
  type BundleOrderLike,
} from "./analytics-profit-rules";

const noon = (ymd: string) => `${ymd}T07:00:00.000Z`;
const RANGE = { start: "2026-08-01", end: "2026-08-31" };

function order(
  partial: Partial<BundleOrderLike> & Pick<BundleOrderLike, "orderId" | "createdAt">
): BundleOrderLike {
  return {
    status: "new",
    total: 1000,
    items: [{ slug: "watch", name: "Watch", price: 1000, quantity: 1, lineTotal: 1000 }],
    customer: { email: "a@example.com", city: "Lahore" },
    source: null,
    ...partial,
  };
}

describe("priorYmdRange", () => {
  it("returns an equal-length window immediately before the current range", () => {
    assert.deepEqual(priorYmdRange({ start: "2026-08-02", end: "2026-08-08" }), {
      start: "2026-07-26",
      end: "2026-08-01",
    });
  });
});

describe("buildMoneyStory", () => {
  it("splits placed-in-range money into in-hand, cancelled, and still moving", () => {
    const story = buildMoneyStory(
      [
        order({
          orderId: "VG-D",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-12") }],
          total: 5000,
        }),
        order({
          orderId: "VG-C",
          createdAt: noon("2026-08-11"),
          status: "cancelled",
          statusHistory: [{ status: "cancelled", at: noon("2026-08-12") }],
          total: 2000,
        }),
        order({
          orderId: "VG-W",
          createdAt: noon("2026-08-12"),
          status: "shipped",
          total: 3000,
        }),
        order({
          orderId: "VG-OLD",
          createdAt: noon("2026-07-01"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-05") }],
          total: 9999,
        }),
      ],
      RANGE
    );
    assert.equal(story.placedCount, 3);
    assert.equal(story.booked, 10000);
    assert.equal(story.kept, 5000);
    assert.equal(story.lost, 2000);
    assert.equal(story.waiting, 3000);
    assert.equal(story.keptCount, 1);
    assert.equal(story.lostCount, 1);
    assert.equal(story.waitingCount, 1);
    assert.equal(story.deliveredAov, 5000);
    assert.deepEqual(story.per100, { delivered: 33, cancelled: 33, waiting: 34 });
    assert.equal(story.health, "Too many orders are dying");
  });
});

describe("buildPeriodComparison", () => {
  it("compares delivered revenue to the previous equal window", () => {
    const current = order({
      orderId: "VG-NOW",
      createdAt: noon("2026-08-10"),
      status: "delivered",
      statusHistory: [{ status: "delivered", at: noon("2026-08-10") }],
      total: 4000,
    });
    const prior = order({
      orderId: "VG-THEN",
      createdAt: noon("2026-07-10"),
      status: "delivered",
      statusHistory: [{ status: "delivered", at: noon("2026-07-10") }],
      total: 2000,
    });
    const cmp = buildPeriodComparison([current, prior], RANGE);
    assert.deepEqual(cmp.previousRange, { start: "2026-07-01", end: "2026-07-31" });
    assert.equal(cmp.deliveredRevenue.current, 4000);
    assert.equal(cmp.deliveredRevenue.previous, 2000);
    assert.equal(cmp.deliveredRevenue.pct, 1);
    assert.equal(cmp.cancellationRate.current, 0);
  });
});

describe("buildFulfillmentHours", () => {
  it("returns median hours between status timestamps", () => {
    const hours = buildFulfillmentHours(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-01"),
          status: "delivered",
          statusHistory: [
            { status: "processing", at: "2026-08-01T09:00:00.000Z" },
            { status: "shipped", at: "2026-08-01T21:00:00.000Z" },
            { status: "delivered", at: "2026-08-02T21:00:00.000Z" },
          ],
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-02"),
          status: "delivered",
          statusHistory: [
            { status: "processing", at: "2026-08-02T09:00:00.000Z" },
            { status: "shipped", at: "2026-08-02T15:00:00.000Z" },
            { status: "delivered", at: "2026-08-03T15:00:00.000Z" },
          ],
        }),
      ],
      RANGE
    );
    assert.equal(hours.samples, 2);
    assert.equal(hours.placedToProcessing, 2);
    assert.equal(hours.processingToShipped, 9);
    assert.equal(hours.shippedToDelivered, 24);
    assert.equal(hours.placedToDelivered, 35);
  });
});

describe("buildProductConversion", () => {
  it("counts view to cart to order to delivered for a slug", () => {
    const sessions: TrafficSession[] = [
      {
        id: "s1",
        visitorId: "v1",
        startedAt: noon("2026-08-10"),
        isDemo: false,
        source: "tiktok",
        landingPath: "/product/watch",
      },
      {
        id: "s2",
        visitorId: "v2",
        startedAt: noon("2026-08-11"),
        isDemo: false,
        source: "tiktok",
        landingPath: "/product/watch",
      },
    ];
    const events: TrafficEvent[] = [
      { sessionId: "s1", name: "product_view", occurredAt: noon("2026-08-10"), productSlug: "watch" },
      { sessionId: "s2", name: "product_view", occurredAt: noon("2026-08-11"), productSlug: "watch" },
      { sessionId: "s1", name: "add_to_cart", occurredAt: noon("2026-08-10"), productSlug: "watch" },
    ];
    const rows = buildProductConversion(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-12") }],
        }),
      ],
      sessions,
      events,
      RANGE
    );
    const watch = rows.find((r) => r.slug === "watch");
    assert.ok(watch);
    assert.equal(watch.views, 2);
    assert.equal(watch.addToCart, 1);
    assert.equal(watch.ordersPlaced, 1);
    assert.equal(watch.ordersDelivered, 1);
    assert.equal(watch.viewToCart, 0.5);
    assert.equal(watch.cartToOrder, 1);
  });
});

describe("buildSourceMoney", () => {
  it("groups delivered money by attrib source and leaves ROAS empty without spend", () => {
    const rows = buildSourceMoney(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-10") }],
          total: 8000,
          source: "tiktok",
        }),
        order({
          orderId: "VG-2",
          createdAt: noon("2026-08-11"),
          status: "cancelled",
          statusHistory: [{ status: "cancelled", at: noon("2026-08-11") }],
          total: 2000,
          source: null,
        }),
      ],
      RANGE,
      {}
    );
    const tiktok = rows.find((r) => r.source === "tiktok");
    const none = rows.find((r) => r.source === "unattributed");
    assert.ok(tiktok);
    assert.equal(tiktok.deliveredRevenue, 8000);
    assert.equal(tiktok.roas, null);
    assert.ok(none);
    assert.equal(none.lost, 2000);
  });

  it("computes ROAS only when spend is greater than zero", () => {
    const rows = buildSourceMoney(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-10") }],
          total: 10000,
          source: "tiktok",
        }),
      ],
      RANGE,
      { tiktok: 2500 }
    );
    assert.equal(rows[0].spend, 2500);
    assert.equal(rows[0].roas, 4);
  });
});

describe("computeRoas", () => {
  it("is not available when spend is missing or zero", () => {
    assert.equal(computeRoas(1000, 0), null);
    assert.equal(computeRoas(1000, null), null);
    assert.equal(computeRoas(8000, 2000), 4);
  });
});

describe("buildRtoProxy", () => {
  it("flags shipped-then-cancelled as a return proxy, not courier-confirmed RTO", () => {
    const rto = buildRtoProxy(
      [
        order({
          orderId: "VG-RTO",
          createdAt: noon("2026-08-10"),
          status: "cancelled",
          statusHistory: [
            { status: "shipped", at: noon("2026-08-11") },
            { status: "cancelled", at: noon("2026-08-14") },
          ],
          total: 4500,
        }),
        order({
          orderId: "VG-EARLY",
          createdAt: noon("2026-08-10"),
          status: "cancelled",
          statusHistory: [{ status: "cancelled", at: noon("2026-08-10") }],
          total: 1000,
        }),
      ],
      RANGE
    );
    assert.equal(rto.count, 1);
    assert.equal(rto.revenue, 4500);
    assert.deepEqual(rto.orderIds, ["VG-RTO"]);
    assert.equal(rto.cancelledBeforeShip, 1);
    assert.match(rto.disclaimer, /not courier-confirmed/i);
  });
});

describe("buildMissingCosts", () => {
  it("lists delivered slugs that still have no cost price", () => {
    const costs: ProductCostRow[] = [{ slug: "watch", name: "Watch", costPrice: null }];
    const rows = buildMissingCosts(
      [
        order({
          orderId: "VG-1",
          createdAt: noon("2026-08-10"),
          status: "delivered",
          statusHistory: [{ status: "delivered", at: noon("2026-08-10") }],
          items: [
            { slug: "watch", name: "Watch", quantity: 2, lineTotal: 2000 },
            { slug: "pad", name: "Pad", quantity: 1, lineTotal: 500 },
          ],
        }),
      ],
      RANGE,
      costs
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].slug, "watch");
    assert.equal(rows[0].quantityDelivered, 2);
  });
});

describe("buildCheckoutFieldFailures", () => {
  it("counts validation errors by field for sessions in the range", () => {
    const sessions: TrafficSession[] = [
      {
        id: "s1",
        visitorId: "v1",
        startedAt: noon("2026-08-10"),
        isDemo: false,
        source: null,
        landingPath: "/checkout",
      },
    ];
    const events: TrafficEvent[] = [
      {
        sessionId: "s1",
        name: "checkout_validation_error",
        occurredAt: noon("2026-08-10"),
        properties: { category: "phone" },
      },
      {
        sessionId: "s1",
        name: "checkout_validation_error",
        occurredAt: noon("2026-08-10"),
        properties: { category: "phone" },
      },
      {
        sessionId: "s1",
        name: "checkout_validation_error",
        occurredAt: noon("2026-08-10"),
        properties: { category: "city" },
      },
    ];
    const rows = buildCheckoutFieldFailures(sessions, events, RANGE);
    assert.equal(rows[0].field, "phone");
    assert.equal(rows[0].count, 2);
    assert.equal(rows[1].field, "city");
    assert.equal(rows[1].count, 1);
  });
});

describe("buildProfitAlerts", () => {
  it("raises plain-language watches for cancels, missing costs, and waiting money", () => {
    const alerts = buildProfitAlerts({
      moneyStory: buildMoneyStory(
        [
          order({
            orderId: "VG-C1",
            createdAt: noon("2026-08-01"),
            status: "cancelled",
            statusHistory: [{ status: "cancelled", at: noon("2026-08-01") }],
            total: 8000,
          }),
          order({
            orderId: "VG-W1",
            createdAt: noon("2026-08-02"),
            status: "processing",
            total: 9000,
          }),
          order({
            orderId: "VG-D1",
            createdAt: noon("2026-08-03"),
            status: "delivered",
            statusHistory: [{ status: "delivered", at: noon("2026-08-03") }],
            total: 1000,
          }),
        ],
        RANGE
      ),
      comparison: {
        previousRange: { start: "2026-07-01", end: "2026-07-31" },
        deliveredRevenue: { current: 1000, previous: 2000, pct: -0.5 },
        cancellationRate: { current: 0.33, previous: 0.1, pct: null },
        ordersPlaced: { current: 3, previous: 3, pct: 0 },
      },
      missingCosts: [{ slug: "watch", name: "Watch", quantityDelivered: 1 }],
      rto: {
        count: 0,
        revenue: 0,
        orderIds: [],
        cancelledBeforeShip: 1,
        shippedCount: 0,
        disclaimer: "x",
      },
      checkoutFields: [{ field: "phone", count: 12 }],
    });
    const ids = alerts.map((a) => a.id);
    assert.ok(ids.includes("high_cancel"));
    assert.ok(ids.includes("money_waiting"));
    assert.ok(ids.includes("missing_costs"));
    assert.ok(ids.includes("revenue_down"));
    assert.ok(ids.includes("checkout_friction"));
  });
});

describe("ad spend store", () => {
  it("saves spend for a range without inventing other periods", () => {
    const key = adSpendRangeKey(RANGE);
    const store = upsertAdSpend({}, RANGE, { tiktok: 5000, facebook: -1 });
    assert.deepEqual(spendForRange(store, RANGE), { tiktok: 5000 });
    assert.equal(key, "2026-08-01|2026-08-31");
    assert.deepEqual(parseAdSpendStore({ ranges: store.ranges }), store);
  });

  it("maps facebook spend onto meta so it matches order attribution", () => {
    const store = upsertAdSpend({ ranges: {} }, RANGE, { facebook: 1000 });
    assert.equal(spendForRange(store, RANGE).meta, 1000);
  });

  it("keeps packing and COD fees when spend is updated", () => {
    const withFees = upsertUnitFees(parseAdSpendStore({}), { packingFee: 40, codFee: 25 });
    const store = upsertAdSpend(withFees, RANGE, { tiktok: 500 });
    assert.equal(store.packingFee, 40);
    assert.equal(store.codFee, 25);
    assert.equal(spendForRange(store, RANGE).tiktok, 500);
  });
});

describe("rowsToCsv", () => {
  it("quotes commas and quotes", () => {
    const csv = rowsToCsv(
      [
        { name: "Watch, Pro", note: 'He said "ok"' },
        { name: "Pad", note: "plain" },
      ],
      [
        { key: "name", header: "Product" },
        { key: "note", header: "Note" },
      ]
    );
    assert.equal(csv, 'Product,Note\n"Watch, Pro","He said ""ok"""\nPad,plain');
  });
});
