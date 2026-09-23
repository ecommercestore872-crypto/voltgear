import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FULFILLMENT_MATURITY_HOURS,
  buildInsights,
  relativeDrop,
  relativeRise,
  type InsightCard,
} from "./analytics-insight-rules";

const NOW = new Date("2026-08-28T07:00:00.000Z");

type BuildInput = Parameters<typeof buildInsights>[0];

function baseInput(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    now: NOW,
    trafficAvailable: true,
    sessionCount: 100,
    convertedSessions: 20,
    shop: {
      pvRate: 0.5,
      atcRate: 0.3,
      checkoutRate: 0.5,
      convertRate: 0.6,
    },
    prior: null,
    sources: [],
    landings: [],
    validationEvents: [],
    maturePlaced: 0,
    matureProcessingReached: 0,
    matureCancelled: 0,
    priorMature: null,
    ...overrides,
  };
}

function ids(cards: InsightCard[]): string[] {
  return cards.map((c) => c.id);
}

describe("FULFILLMENT_MATURITY_HOURS", () => {
  it("is 24", () => {
    assert.equal(FULFILLMENT_MATURITY_HOURS, 24);
  });
});

describe("relativeDrop", () => {
  it("returns null when prior is 0", () => {
    assert.equal(relativeDrop(0, 0.1), null);
  });

  it("computes (prior - current) / prior", () => {
    assert.equal(relativeDrop(0.4, 0.2), 0.5);
  });
});

describe("relativeRise", () => {
  it("returns null when prior is 0", () => {
    assert.equal(relativeRise(0, 0.1), null);
  });

  it("computes (current - prior) / prior", () => {
    assert.equal(relativeRise(0.1, 0.2), 1);
  });
});

describe("buildInsights", () => {
  it("does not fire relative shop_drop_product_view when prior pv rate is 0", () => {
    const cards = buildInsights(
      baseInput({
        shop: { pvRate: 0.35, atcRate: 0.3, checkoutRate: 0.5, convertRate: 0.6 },
        prior: {
          trafficAvailable: true,
          sessionCount: 100,
          shop: { pvRate: 0, atcRate: 0.3, checkoutRate: 0.5, convertRate: 0.6 },
        },
      })
    );
    assert.equal(ids(cards).includes("shop_drop_product_view"), false);
  });

  it("emits only one source_underperforms card for the worst gap", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 100,
        convertedSessions: 20,
        sources: [
          { source: "tiktok", sessions: 50, convertedRate: 0.02 },
          { source: "facebook", sessions: 40, convertedRate: 0.01 },
        ],
      })
    );
    const sourceCards = cards.filter((c) => c.id === "source_underperforms");
    assert.equal(sourceCards.length, 1);
    assert.match(sourceCards[0].evidence.join(" "), /facebook/i);
  });

  it("does not emit fulfillment_processing_gap when mature placed is below 10", () => {
    const cards = buildInsights(
      baseInput({
        trafficAvailable: false,
        maturePlaced: 5,
        matureProcessingReached: 0,
        matureCancelled: 0,
      })
    );
    assert.equal(ids(cards).includes("fulfillment_processing_gap"), false);
  });

  it("does not emit landing_low_pdp for checkout landing paths", () => {
    const cards = buildInsights(
      baseInput({
        landings: [
          { path: "/checkout", sessions: 50, pvReachRate: 0.05 },
          { path: "/checkout/confirm", sessions: 60, pvReachRate: 0.02 },
        ],
      })
    );
    assert.equal(ids(cards).includes("landing_low_pdp"), false);
  });

  it("emits no shop insight cards when session count is below 30", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 25,
        shop: { pvRate: 0.05, atcRate: 0.02, checkoutRate: 0.05, convertRate: 0.1 },
      })
    );
    const shopIds = [
      "shop_drop_product_view",
      "shop_drop_add_to_cart",
      "shop_drop_checkout",
      "shop_drop_convert",
    ];
    assert.equal(cards.some((c) => shopIds.includes(c.id)), false);
  });

  it("never emits confidence LOW", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 120,
        convertedSessions: 5,
        shop: { pvRate: 0.05, atcRate: 0.02, checkoutRate: 0.05, convertRate: 0.1 },
        prior: {
          trafficAvailable: true,
          sessionCount: 120,
          shop: { pvRate: 0.6, atcRate: 0.5, checkoutRate: 0.6, convertRate: 0.8 },
        },
        sources: [
          { source: "tiktok", sessions: 50, convertedRate: 0.01 },
          { source: "google", sessions: 40, convertedRate: 0.02 },
        ],
        landings: [{ path: "/product/pad", sessions: 50, pvReachRate: 0.05 }],
        validationEvents: Array.from({ length: 25 }, () => ({ category: "phone" })),
        maturePlaced: 40,
        matureProcessingReached: 5,
        matureCancelled: 15,
        priorMature: { placed: 40, processingReached: 30, cancelled: 2 },
      })
    );
    assert.equal(cards.every((c) => c.confidence === "HIGH" || c.confidence === "MEDIUM"), true);
    assert.equal(cards.some((c) => c.confidence === "LOW"), false);
  });

  it("fires shop_drop_product_view on absolute floor with MEDIUM when sessions are 40 and no prior", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 40,
        convertedSessions: 8,
        shop: { pvRate: 0.1, atcRate: 0.3, checkoutRate: 0.5, convertRate: 0.6 },
        prior: null,
      })
    );
    const card = cards.find((c) => c.id === "shop_drop_product_view");
    assert.ok(card);
    assert.equal(card.confidence, "MEDIUM");
  });

  it("sorts HIGH before MEDIUM then by larger gap magnitude", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 120,
        convertedSessions: 10,
        shop: { pvRate: 0.1, atcRate: 0.3, checkoutRate: 0.5, convertRate: 0.6 },
        prior: {
          trafficAvailable: true,
          sessionCount: 120,
          shop: { pvRate: 0.5, atcRate: 0.3, checkoutRate: 0.5, convertRate: 0.6 },
        },
        maturePlaced: 40,
        matureProcessingReached: 5,
        matureCancelled: 0,
        priorMature: { placed: 40, processingReached: 30, cancelled: 0 },
      })
    );
    assert.ok(cards.length >= 2);
    const highIndex = cards.findIndex((c) => c.confidence === "HIGH");
    const mediumIndex = cards.findIndex((c) => c.confidence === "MEDIUM");
    if (highIndex >= 0 && mediumIndex >= 0) {
      assert.ok(highIndex < mediumIndex);
    }
  });

  it("caps output at 8 cards", () => {
    const cards = buildInsights(
      baseInput({
        sessionCount: 120,
        convertedSessions: 2,
        shop: { pvRate: 0.05, atcRate: 0.02, checkoutRate: 0.05, convertRate: 0.1 },
        prior: {
          trafficAvailable: true,
          sessionCount: 120,
          shop: { pvRate: 0.6, atcRate: 0.5, checkoutRate: 0.6, convertRate: 0.8 },
        },
        sources: [
          { source: "tiktok", sessions: 50, convertedRate: 0.01 },
          { source: "google", sessions: 40, convertedRate: 0.02 },
        ],
        landings: [{ path: "/product/pad", sessions: 50, pvReachRate: 0.05 }],
        validationEvents: Array.from({ length: 25 }, () => ({ category: "phone" })),
        maturePlaced: 40,
        matureProcessingReached: 5,
        matureCancelled: 15,
        priorMature: { placed: 40, processingReached: 30, cancelled: 2 },
      })
    );
    assert.ok(cards.length <= 8);
  });

  it("emits fulfillment_cancel_rate on relative rise when absolute cancel rate is below 25%", () => {
    const cards = buildInsights(
      baseInput({
        trafficAvailable: false,
        maturePlaced: 40,
        matureCancelled: 8,
        priorMature: { placed: 40, processingReached: 30, cancelled: 4 },
      })
    );
    const card = cards.find((c) => c.id === "fulfillment_cancel_rate");
    assert.ok(card);
    assert.match(card.evidence.join(" "), /relative rise/i);
  });

  it("does not emit fulfillment_cancel_rate when cancel rate improves", () => {
    const cards = buildInsights(
      baseInput({
        trafficAvailable: false,
        maturePlaced: 40,
        matureCancelled: 4,
        priorMature: { placed: 40, processingReached: 30, cancelled: 8 },
      })
    );
    assert.equal(ids(cards).includes("fulfillment_cancel_rate"), false);
  });

  it("does not emit fulfillment_cancel_rate on relative rise when prior cancel rate is 0", () => {
    const cards = buildInsights(
      baseInput({
        trafficAvailable: false,
        maturePlaced: 40,
        matureCancelled: 4,
        priorMature: { placed: 40, processingReached: 30, cancelled: 0 },
      })
    );
    assert.equal(ids(cards).includes("fulfillment_cancel_rate"), false);
  });

  it("skips shop, source, landing, and validation cards when traffic is not available", () => {
    const cards = buildInsights(
      baseInput({
        trafficAvailable: false,
        shop: { pvRate: 0.05, atcRate: 0.02, checkoutRate: 0.05, convertRate: 0.1 },
        sources: [{ source: "tiktok", sessions: 50, convertedRate: 0.01 }],
        landings: [{ path: "/product/pad", sessions: 50, pvReachRate: 0.05 }],
        validationEvents: Array.from({ length: 25 }, () => ({ category: "phone" })),
        maturePlaced: 40,
        matureProcessingReached: 5,
        matureCancelled: 0,
      })
    );
    const trafficIds = [
      "shop_drop_product_view",
      "shop_drop_add_to_cart",
      "shop_drop_checkout",
      "shop_drop_convert",
      "source_underperforms",
      "landing_low_pdp",
      "checkout_validation_hotspot",
    ];
    assert.equal(cards.some((c) => trafficIds.includes(c.id)), false);
    assert.ok(cards.some((c) => c.id === "fulfillment_processing_gap"));
  });
});
