import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPurchaseSanityReport,
  evaluatePurchaseCoverage,
  ordersInRangeForPurchaseSanity,
} from "./purchase-sanity-rules";

describe("evaluatePurchaseCoverage", () => {
  it("flags duplicate Purchase events", () => {
    const r = evaluatePurchaseCoverage({ placedOrders: 10, externalPurchases: 12 });
    assert.equal(r.status, "critical");
  });

  it("allows low pixel capture with a warning", () => {
    const r = evaluatePurchaseCoverage({ placedOrders: 10, externalPurchases: 1 });
    assert.equal(r.status, "warning");
  });

  it("accepts plausible ratios", () => {
    const r = evaluatePurchaseCoverage({ placedOrders: 10, externalPurchases: 7 });
    assert.equal(r.status, "ok");
  });
});

describe("buildPurchaseSanityReport", () => {
  const now = new Date("2026-09-25T12:00:00.000Z");

  it("counts live orders in last7 and compares optional channel totals", () => {
    const report = buildPurchaseSanityReport({
      preset: "last7",
      now,
      tiktokPurchases: 4,
      metaPurchases: 6,
      rows: [
        {
          orderId: "A1",
          createdAt: "2026-09-24T10:00:00.000Z",
          total: 5000,
          attrib_ttclid: "tt",
        },
        {
          orderId: "A2",
          createdAt: "2026-09-20T10:00:00.000Z",
          total: 3000,
          isDemo: true,
        },
        {
          orderId: "A3",
          createdAt: "2026-01-01T10:00:00.000Z",
          total: 1000,
        },
      ],
    });
    assert.equal(report.placedOrders, 1);
    assert.equal(report.revenuePlacedPkr, 5000);
    assert.equal(report.attribution.withTtclid, 1);
    assert.equal(report.external.length, 2);
  });
});

describe("ordersInRangeForPurchaseSanity", () => {
  it("excludes demo orders", () => {
    const range = { start: "2026-09-01", end: "2026-09-30" };
    const rows = ordersInRangeForPurchaseSanity(
      [
        { orderId: "1", createdAt: "2026-09-10T00:00:00.000Z", isDemo: true },
        { orderId: "2", createdAt: "2026-09-10T00:00:00.000Z" },
      ],
      range,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.orderId, "2");
  });
});
