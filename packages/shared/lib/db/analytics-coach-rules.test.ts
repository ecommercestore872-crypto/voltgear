import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TARGET_PROFIT_BUFFER,
  allocateAdBudget,
  averageAllocatedShipping,
  averagePaidUnitPrice,
  buildCoach,
  isPrepaidPayment,
  matureOutcomeRates,
  orderShippingAmount,
  parseCoachCostItems,
  parseCoachFees,
  safeSellingFloor,
  splitAcrossChannels,
  type CoachCatalogProduct,
  type CoachPerf,
} from "./analytics-coach-rules";
import type { AnalyticsOrder } from "./analytics-rules";

describe("safeSellingFloor", () => {
  it("spreads shipping and RTO leak across delivered orders, then keeps a 20% buffer", () => {
    const floor = safeSellingFloor({
      cost: 1000,
      shippingFee: 200,
      deliveryRate: 0.7,
      rtoRate: 0.1,
    });
    assert.equal(TARGET_PROFIT_BUFFER, 0.2);
    assert.equal(floor, 1536);
  });

  it("is not available without a cost", () => {
    assert.equal(
      safeSellingFloor({
        cost: null,
        shippingFee: 200,
        deliveryRate: 0.7,
        rtoRate: 0,
      }),
      null
    );
  });
});

describe("buildCoach", () => {
  const catalog: CoachCatalogProduct[] = [
    { id: "p1", slug: "watch", name: "Watch", price: 2000, costPrice: 1000 },
    { id: "p2", slug: "pad", name: "Pad", price: 1200, costPrice: 1000 },
    { id: "p3", slug: "cable", name: "Cable", price: 800, costPrice: null },
    { id: "p4", slug: "stand", name: "Stand", price: 2500, costPrice: 400 },
  ];

  const perf: CoachPerf[] = [
    {
      slug: "watch",
      name: "Watch",
      deliveredRevenue: 8000,
      deliveredGrossProfit: 4000,
      cancellationRate: 0.1,
      deliverySuccessRate: 0.7,
      views: 40,
      addToCart: 12,
      viewToCart: 0.3,
      ordersPlaced: 4,
    },
    {
      slug: "pad",
      name: "Pad",
      deliveredRevenue: 1200,
      deliveredGrossProfit: 50,
      cancellationRate: 0.32,
      deliverySuccessRate: 0.5,
      views: 80,
      addToCart: 4,
      viewToCart: 0.05,
      ordersPlaced: 6,
    },
    {
      slug: "cable",
      name: "Cable",
      deliveredRevenue: 800,
      deliveredGrossProfit: null,
      cancellationRate: 0.05,
      deliverySuccessRate: 0.9,
      views: 10,
      addToCart: 2,
      viewToCart: 0.2,
      ordersPlaced: 1,
    },
    {
      slug: "stand",
      name: "Stand",
      deliveredRevenue: 2500,
      deliveredGrossProfit: 1800,
      cancellationRate: 0.18,
      deliverySuccessRate: 0.7,
      views: 100,
      addToCart: 3,
      viewToCart: 0.03,
      ordersPlaced: 2,
    },
  ];

  it("flags missing cost, too-cheap prices, and which products may take ads", () => {
    const coach = buildCoach({
      catalog,
      perf,
      shippingFee: 200,
      rtoRate: 0.1,
      shopDeliveryRate: 0.7,
      sourceMoney: [
        { source: "tiktok", deliveredRevenue: 6000, spend: 1500, roas: 4 },
        { source: "meta", deliveredRevenue: 3000, spend: 1500, roas: 2 },
      ],
      budget: 10000,
    });
    const watch = coach.products.find((p) => p.slug === "watch");
    const pad = coach.products.find((p) => p.slug === "pad");
    const cable = coach.products.find((p) => p.slug === "cable");
    const stand = coach.products.find((p) => p.slug === "stand");
    assert.ok(watch);
    assert.equal(watch.verdict, "safe");
    assert.equal(watch.health, "performing");
    assert.equal(watch.canAdvertise, true);
    assert.ok((watch.breakEvenRoas ?? 0) > 2);
    assert.ok(pad);
    assert.equal(pad.health, "weak");
    assert.equal(pad.canAdvertise, false);
    assert.ok(cable);
    assert.equal(cable.verdict, "fill_cost");
    assert.equal(cable.canAdvertise, false);
    assert.ok(stand);
    assert.equal(stand.health, "needs_improvement");
    assert.equal(stand.canAdvertise, true);
  });

  it("puts most of a typed budget on performing products, almost none on weak", () => {
    const coach = buildCoach({
      catalog,
      perf,
      shippingFee: 200,
      rtoRate: 0.1,
      shopDeliveryRate: 0.7,
      sourceMoney: [
        { source: "tiktok", deliveredRevenue: 6000, spend: 1500, roas: 4 },
        { source: "meta", deliveredRevenue: 3000, spend: 1500, roas: 2 },
      ],
      budget: 10000,
    });
    const watch = coach.products.find((p) => p.slug === "watch");
    const stand = coach.products.find((p) => p.slug === "stand");
    const pad = coach.products.find((p) => p.slug === "pad");
    const cable = coach.products.find((p) => p.slug === "cable");
    assert.ok(watch && stand && pad && cable);
    assert.equal((watch.suggestedSpend ?? 0) > (stand.suggestedSpend ?? 0), true);
    assert.equal(pad.suggestedSpend, 0);
    assert.equal(cable.suggestedSpend, 0);
    const paid = coach.products.reduce((s, p) => s + (p.suggestedSpend ?? 0), 0);
    assert.equal(paid, 10000);
    assert.ok((watch.channelSplit.find((c) => c.source === "tiktok")?.amount ?? 0) >
      (watch.channelSplit.find((c) => c.source === "meta")?.amount ?? 0));
  });
});

describe("allocateAdBudget", () => {
  it("uses 70 / 20 and rolls the weak slice into performing when weak cannot take ads", () => {
    const rows = allocateAdBudget(
      [
        { slug: "a", health: "performing", canAdvertise: true, weight: 800 },
        { slug: "b", health: "performing", canAdvertise: true, weight: 200 },
        { slug: "c", health: "needs_improvement", canAdvertise: true, weight: 100 },
        { slug: "d", health: "weak", canAdvertise: false, weight: 50 },
      ],
      10000
    );
    assert.equal(rows.find((r) => r.slug === "a")?.amount, 6400);
    assert.equal(rows.find((r) => r.slug === "b")?.amount, 1600);
    assert.equal(rows.find((r) => r.slug === "c")?.amount, 2000);
    assert.equal(rows.find((r) => r.slug === "d")?.amount, 0);
  });
});

describe("splitAcrossChannels", () => {
  it("gives more of a product budget to the channel with higher ROAS", () => {
    const split = splitAcrossChannels(900, [
      { source: "tiktok", roas: 4, deliveredRevenue: 1, spend: 1 },
      { source: "meta", roas: 2, deliveredRevenue: 1, spend: 1 },
    ]);
    assert.equal(split.find((s) => s.source === "tiktok")?.amount, 600);
    assert.equal(split.find((s) => s.source === "meta")?.amount, 300);
  });

  it("does not invent ROAS when nobody typed spend", () => {
    const split = splitAcrossChannels(900, [
      { source: "tiktok", roas: null, deliveredRevenue: 8000, spend: 0 },
      { source: "meta", roas: null, deliveredRevenue: 2000, spend: 0 },
    ]);
    assert.equal(split.find((s) => s.source === "tiktok")?.amount, 720);
    assert.equal(split.find((s) => s.source === "meta")?.amount, 180);
    assert.match(split[0].note, /not ROAS/i);
  });
});

describe("parseCoachCostItems", () => {
  it("keeps only finite non-negative costs with a slug", () => {
    const parsed = parseCoachCostItems({
      items: [
        { slug: "watch", costPrice: 1100 },
        { slug: "", costPrice: 1 },
        { slug: "pad", costPrice: -4 },
        { slug: "cable", costPrice: "40" },
      ],
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.items, [
        { slug: "watch", costPrice: 1100 },
        { slug: "cable", costPrice: 40 },
      ]);
    }
  });

  it("allows a fee-only payload with no items", () => {
    const parsed = parseCoachCostItems({ packingFee: 40 });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.deepEqual(parsed.items, []);
  });
});

describe("parseCoachFees", () => {
  it("keeps packing and COD only when they are finite and non-negative", () => {
    assert.deepEqual(parseCoachFees({ packingFee: 40, codFee: "30" }), { packingFee: 40, codFee: 30 });
    assert.deepEqual(parseCoachFees({ packingFee: -1, codFee: 0 }), { codFee: 0 });
    assert.deepEqual(parseCoachFees({ items: [] }), {});
  });
});

describe("COD accuracy helpers", () => {
  const NOW = new Date("2026-09-05T07:00:00.000Z");
  const RANGE = { start: "2026-08-20", end: "2026-09-05" };
  const settings = { shippingFee: 200, freeShippingThreshold: 3000 };

  function live(partial: Partial<AnalyticsOrder> & Pick<AnalyticsOrder, "orderId">): AnalyticsOrder {
    return {
      createdAt: "2026-08-25T07:00:00.000Z",
      status: "delivered",
      statusHistory: [{ status: "delivered", at: "2026-08-26T07:00:00.000Z" }],
      total: 2200,
      subtotal: 2000,
      shipping: 200,
      payment: "cod",
      items: [{ slug: "watch", name: "Watch", price: 2000, quantity: 1, lineTotal: 2000 }],
      ...partial,
    };
  }

  it("treats empty, cash, and COD as cash-on-delivery", () => {
    assert.equal(isPrepaidPayment("cod"), false);
    assert.equal(isPrepaidPayment(""), false);
    assert.equal(isPrepaidPayment("cash"), false);
    assert.equal(isPrepaidPayment("card"), true);
  });

  it("uses actual order shipping, including free shipping", () => {
    assert.equal(orderShippingAmount(live({ orderId: "s1", shipping: 0 }), settings), 0);
    assert.equal(
      orderShippingAmount(live({ orderId: "s2", shipping: undefined, subtotal: 3500, items: [] }), settings),
      0
    );
    assert.equal(
      orderShippingAmount(live({ orderId: "s3", shipping: undefined, subtotal: 500, items: [] }), settings),
      200
    );
  });

  it("averages what customers actually paid, not the listed catalog price", () => {
    const orders = [
      live({
        orderId: "d1",
        items: [{ slug: "watch", name: "Watch", price: 1400, quantity: 1, lineTotal: 1400 }],
        subtotal: 1400,
        total: 1600,
      }),
      live({
        orderId: "d2",
        items: [{ slug: "watch", name: "Watch", price: 1600, quantity: 1, lineTotal: 1600 }],
        subtotal: 1600,
        total: 1800,
      }),
    ];
    assert.equal(averagePaidUnitPrice(orders, "watch", RANGE), 1500);
  });

  it("splits shared shipping across items, and zeros free-shipping parcels", () => {
    const shared = live({
      orderId: "share",
      shipping: 200,
      subtotal: 2000,
      items: [
        { slug: "watch", name: "Watch", price: 1000, quantity: 1, lineTotal: 1000 },
        { slug: "pad", name: "Pad", price: 1000, quantity: 1, lineTotal: 1000 },
      ],
    });
    const free = live({
      orderId: "free",
      shipping: 0,
      subtotal: 3500,
      items: [{ slug: "watch", name: "Watch", price: 3500, quantity: 1, lineTotal: 3500 }],
    });
    assert.equal(averageAllocatedShipping([shared], "watch", RANGE, settings), 100);
    assert.equal(averageAllocatedShipping([free], "watch", RANGE, settings), 0);
  });

  it("does not count in-transit or young parcels as failed deliveries", () => {
    const mature = Array.from({ length: 5 }, (_, i) =>
      live({ orderId: `m${i}`, createdAt: "2026-08-25T07:00:00.000Z", status: "delivered" })
    );
    const youngCancels = Array.from({ length: 10 }, (_, i) =>
      live({
        orderId: `y${i}`,
        createdAt: "2026-09-04T12:00:00.000Z",
        status: "cancelled",
        statusHistory: [{ status: "cancelled", at: "2026-09-04T13:00:00.000Z" }],
      })
    );
    const rates = matureOutcomeRates([...mature, ...youngCancels], "watch", RANGE, NOW);
    assert.equal(rates.sample, 5);
    assert.equal(rates.deliveryRate, 1);
    assert.equal(rates.cancelRate, 0);
  });
});

describe("buildCoach accuracy", () => {
  const NOW = new Date("2026-09-05T07:00:00.000Z");
  const RANGE = { start: "2026-08-20", end: "2026-09-05" };
  const catalog: CoachCatalogProduct[] = [
    { id: "p1", slug: "watch", name: "Watch", price: 2000, costPrice: 1000 },
  ];
  const perf: CoachPerf[] = [
    {
      slug: "watch",
      name: "Watch",
      deliveredRevenue: 8000,
      deliveredGrossProfit: 4000,
      cancellationRate: 0.1,
      deliverySuccessRate: 0.7,
      views: 40,
      addToCart: 12,
      viewToCart: 0.3,
      ordersPlaced: 4,
    },
  ];

  function matureDelivered(partial: Partial<AnalyticsOrder> & Pick<AnalyticsOrder, "orderId">): AnalyticsOrder {
    return {
      createdAt: "2026-08-25T07:00:00.000Z",
      status: "delivered",
      statusHistory: [{ status: "delivered", at: "2026-08-26T07:00:00.000Z" }],
      payment: "cod",
      shipping: 200,
      subtotal: 2000,
      total: 2200,
      items: [{ slug: "watch", name: "Watch", price: 2000, quantity: 1, lineTotal: 2000 }],
      ...partial,
    };
  }

  it("adds packing and COD fees you type into the floor", () => {
    const floor = safeSellingFloor({
      cost: 1000,
      shippingFee: 200,
      packingFee: 50,
      codFee: 50,
      deliveryRate: 1,
      rtoRate: 0,
    });
    assert.equal(floor, 1625);
  });

  it("flags a discounted paid price even when the listed price looks safe", () => {
    const orders = Array.from({ length: 5 }, (_, i) =>
      matureDelivered({
        orderId: `w${i}`,
        items: [{ slug: "watch", name: "Watch", price: 1400, quantity: 1, lineTotal: 1400 }],
        subtotal: 1400,
        total: 1600,
      })
    );
    const coach = buildCoach({
      catalog,
      perf,
      shippingFee: 200,
      rtoRate: 0,
      shopDeliveryRate: 1,
      sourceMoney: [],
      budget: 0,
      orders,
      range: RANGE,
      now: NOW,
    });
    const watch = coach.products.find((p) => p.slug === "watch");
    assert.ok(watch);
    assert.equal(watch.listedPrice, 2000);
    assert.equal(watch.sellingPrice, 1400);
    assert.equal(watch.floor, 1500);
    assert.equal(watch.verdict, "too_cheap");
  });

  it("does not mark a product performing when finished sample is too thin", () => {
    const orders = Array.from({ length: 2 }, (_, i) => matureDelivered({ orderId: `thin${i}` }));
    const coach = buildCoach({
      catalog,
      perf,
      shippingFee: 200,
      rtoRate: 0,
      shopDeliveryRate: 0.7,
      sourceMoney: [],
      budget: 0,
      orders,
      range: RANGE,
      now: NOW,
    });
    const watch = coach.products.find((p) => p.slug === "watch");
    assert.ok(watch);
    assert.equal(watch.thinSample, true);
    assert.equal(watch.health, "needs_improvement");
    assert.notEqual(watch.health, "performing");
  });

  it("does not apply COD fee on prepaid parcels", () => {
    const orders = Array.from({ length: 5 }, (_, i) =>
      matureDelivered({
        orderId: `pre${i}`,
        payment: "card",
        shipping: 200,
      })
    );
    const withCod = buildCoach({
      catalog,
      perf,
      shippingFee: 200,
      rtoRate: 0,
      shopDeliveryRate: 1,
      sourceMoney: [],
      budget: 0,
      orders,
      range: RANGE,
      now: NOW,
      packingFee: 50,
      codFee: 50,
    });
    const watch = withCod.products.find((p) => p.slug === "watch");
    assert.ok(watch);
    assert.equal(watch.floor, 1563);
  });
});
