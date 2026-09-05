import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AnalyticsOrder } from "./analytics-rules";
import {
  DEAL_BALANCE_RATIO,
  applyDealsToCart,
  comboNeededPaid,
  comboPaidAfterDeal,
  dealClearsFloor,
  maxSafePercentOff,
  pairBalanceOk,
  pairKey,
  parseDealList,
  promoBlockedByDeal,
  publicDealsForSlug,
  suggestDealPairs,
  validateDealAdminInput,
  type DealCatalogProduct,
  type DealRecord,
} from "./deal-rules";

const catalog: DealCatalogProduct[] = [
  { slug: "watch", name: "Watch", price: 2500, costPrice: 900 },
  { slug: "strap", name: "Strap", price: 1200, costPrice: 300 },
  { slug: "cable", name: "Cable", price: 200, costPrice: 40 },
  { slug: "pad", name: "Pad", price: 1800, costPrice: null },
];

const floor = {
  shippingFee: 200,
  packingFee: 0,
  codFee: 0,
  deliveryRate: 1,
  rtoRate: 0,
};

describe("pairBalanceOk", () => {
  it("rejects a 2500 + 200 pair and allows a 2500 + 1200 pair", () => {
    assert.equal(DEAL_BALANCE_RATIO, 0.4);
    assert.equal(pairBalanceOk(2500, 200), false);
    assert.equal(pairBalanceOk(2500, 1200), true);
    assert.equal(pairBalanceOk(2000, 2000), true);
  });
});

describe("cheaper-item discount", () => {
  it("takes percent off the cheaper unit only", () => {
    assert.equal(comboPaidAfterDeal(2500, 1200, 10), 3580);
  });
});

describe("validateDealAdminInput", () => {
  it("blocks the 2500 + 200 loophole", () => {
    const parsed = validateDealAdminInput(
      { slugA: "watch", slugB: "cable", percentOff: 10 },
      catalog,
      [],
      floor
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /unbalanced/i);
  });

  it("blocks a live deal when a cost is missing", () => {
    const parsed = validateDealAdminInput(
      { slugA: "watch", slugB: "pad", percentOff: 10 },
      catalog,
      [],
      floor
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /cost/i);
  });

  it("accepts a balanced pair that stays above the floor", () => {
    const parsed = validateDealAdminInput(
      { slugA: "watch", slugB: "strap", percentOff: 10 },
      catalog,
      [],
      floor
    );
    assert.equal(parsed.ok, true);
  });

  it("treats A+B and B+A as the same pair", () => {
    const existing: DealRecord[] = [
      { id: "d1", title: "Watch + Strap", slugA: "strap", slugB: "watch", percentOff: 10, active: true },
    ];
    const parsed = validateDealAdminInput(
      { slugA: "watch", slugB: "strap", percentOff: 10 },
      catalog,
      existing,
      floor
    );
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /already/i);
    assert.equal(pairKey("watch", "strap"), pairKey("strap", "watch"));
  });
});

describe("applyDealsToCart", () => {
  const deal: DealRecord = {
    id: "d1",
    title: "Watch + Strap",
    slugA: "watch",
    slugB: "strap",
    percentOff: 10,
    active: true,
  };

  it("does not discount a 2500 + 200 cart even if a deal row exists", () => {
    const result = applyDealsToCart(
      [
        { slug: "watch", quantity: 1, price: 2500 },
        { slug: "cable", quantity: 1, price: 200 },
      ],
      [{ ...deal, slugB: "cable" }]
    );
    assert.equal(result.discount, 0);
    assert.equal(result.applied.length, 0);
  });

  it("applies 10% of the cheaper item once per pair", () => {
    const result = applyDealsToCart(
      [
        { slug: "watch", quantity: 1, price: 2500 },
        { slug: "strap", quantity: 1, price: 1200 },
      ],
      [deal]
    );
    assert.equal(result.discount, 120);
    assert.equal(result.applied[0]?.applications, 1);
  });

  it("applies twice when the cart has two of each", () => {
    const result = applyDealsToCart(
      [
        { slug: "watch", quantity: 2, price: 2500 },
        { slug: "strap", quantity: 2, price: 1200 },
      ],
      [deal]
    );
    assert.equal(result.discount, 240);
    assert.equal(result.applied[0]?.applications, 2);
  });

  it("applies buy-two of the same product as percent off the second unit", () => {
    const result = applyDealsToCart(
      [{ slug: "watch", quantity: 2, price: 2500 }],
      [{ id: "d2", title: "Two watches", slugA: "watch", slugB: "watch", percentOff: 10, active: true }]
    );
    assert.equal(result.discount, 250);
  });
});

describe("promoBlockedByDeal", () => {
  it("blocks percent and fixed coupons when a pair deal already applied", () => {
    assert.equal(promoBlockedByDeal(120, "percent"), true);
    assert.equal(promoBlockedByDeal(120, "fixed"), true);
    assert.equal(promoBlockedByDeal(120, "free_shipping"), false);
    assert.equal(promoBlockedByDeal(0, "percent"), false);
  });
});

describe("suggestDealPairs", () => {
  it("ranks delivered-together pairs and rejects the cheap add-on", () => {
    const orders: AnalyticsOrder[] = [
      {
        orderId: "1",
        createdAt: "2026-08-01T07:00:00.000Z",
        status: "delivered",
        items: [
          { slug: "watch", price: 2500, quantity: 1, lineTotal: 2500 },
          { slug: "strap", price: 1200, quantity: 1, lineTotal: 1200 },
        ],
      },
      {
        orderId: "2",
        createdAt: "2026-08-02T07:00:00.000Z",
        status: "delivered",
        items: [
          { slug: "watch", price: 2500, quantity: 1, lineTotal: 2500 },
          { slug: "cable", price: 200, quantity: 1, lineTotal: 200 },
        ],
      },
      {
        orderId: "3",
        createdAt: "2026-08-03T07:00:00.000Z",
        status: "cancelled",
        items: [
          { slug: "watch", price: 2500, quantity: 1, lineTotal: 2500 },
          { slug: "strap", price: 1200, quantity: 1, lineTotal: 1200 },
        ],
      },
    ];
    const rows = suggestDealPairs(orders, catalog, floor);
    const watchStrap = rows.find((r) => r.slugA === "strap" && r.slugB === "watch");
    const watchCable = rows.find(
      (r) => pairKey(r.slugA, r.slugB) === pairKey("watch", "cable")
    );
    assert.ok(watchStrap);
    assert.equal(watchStrap.canCreate, true);
    assert.equal(watchStrap.deliveredTogether, 1);
    assert.ok(watchCable);
    assert.equal(watchCable.canCreate, false);
    assert.match(watchCable.reason, /unbalanced/i);
  });
});

describe("publicDealsForSlug", () => {
  it("does not expose cost and only returns the other product", () => {
    const deals: DealRecord[] = [
      { id: "d1", title: "Watch + Strap", slugA: "watch", slugB: "strap", percentOff: 10, active: true },
    ];
    const rows = publicDealsForSlug("watch", deals, catalog);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].otherSlug, "strap");
    assert.equal(JSON.stringify(rows).includes("cost"), false);
  });
});

describe("combo floor", () => {
  it("needs cost plus shipping leak plus 20% leftover", () => {
    const needed = comboNeededPaid({
      priceA: 2500,
      priceB: 1200,
      costA: 900,
      costB: 300,
      ...floor,
    });
    assert.equal(needed, 1750);
    assert.equal(dealClearsFloor({ priceA: 2500, priceB: 1200, costA: 900, costB: 300, ...floor }, 10), true);
    assert.ok((maxSafePercentOff({ priceA: 2500, priceB: 1200, costA: 900, costB: 300, ...floor }) ?? 0) >= 10);
  });
});

describe("parseDealList", () => {
  it("drops duplicates of the same unordered pair", () => {
    const rows = parseDealList([
      { id: "1", slugA: "watch", slugB: "strap", percentOff: 10, title: "A" },
      { id: "2", slugA: "strap", slugB: "watch", percentOff: 15, title: "B" },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "1");
  });
});
