import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  derivePostExStatusPreviewAction,
  mapPostExTransactionStatusToBuyNTry,
  normalizePostExTransactionStatus,
} from "./postex-status-map";

describe("normalizePostExTransactionStatus", () => {
  it("trims and collapses whitespace case-insensitively for lookup", () => {
    assert.equal(normalizePostExTransactionStatus("  Booked  "), "booked");
    assert.equal(normalizePostExTransactionStatus("Picked   By   PostEx"), "picked by postex");
  });
});

describe("mapPostExTransactionStatusToBuyNTry", () => {
  const cases: Array<{ postex: string; expected: string }> = [
    { postex: "Unbooked", expected: "processing" },
    { postex: "Booked", expected: "processing" },
    { postex: "Picked By PostEx", expected: "shipped" },
    { postex: "PostEx WareHouse", expected: "shipped" },
    { postex: "En-Route to PostEx warehouse", expected: "shipped" },
    { postex: "Out For Delivery", expected: "shipped" },
    { postex: "Delivered", expected: "delivered" },
  ];

  for (const { postex, expected } of cases) {
    it(`maps ${postex} -> ${expected}`, () => {
      const result = mapPostExTransactionStatusToBuyNTry(postex);
      assert.equal(result.kind, "mapped");
      if (result.kind !== "mapped") return;
      assert.equal(result.buyNTryStatus, expected);
    });
  }

  const manual: string[] = [
    "Returned",
    "Out For Return",
    "Attempted",
    "Delivery Under Review",
    "Expired",
    "Un-Assigned By Me",
  ];

  for (const postex of manual) {
    it(`requires manual review for ${postex}`, () => {
      const result = mapPostExTransactionStatusToBuyNTry(postex);
      assert.equal(result.kind, "manual_review");
    });
  }
});

describe("derivePostExStatusPreviewAction", () => {
  it("Booked + current processing -> no_change", () => {
    const mapResult = mapPostExTransactionStatusToBuyNTry("Booked");
    const preview = derivePostExStatusPreviewAction("processing", mapResult);
    assert.equal(preview.action, "no_change");
    assert.equal(preview.proposedBuyNTryStatus, "processing");
  });

  it("Picked By PostEx + current processing -> would_update to shipped", () => {
    const mapResult = mapPostExTransactionStatusToBuyNTry("Picked By PostEx");
    const preview = derivePostExStatusPreviewAction("processing", mapResult);
    assert.equal(preview.action, "would_update");
    assert.equal(preview.proposedBuyNTryStatus, "shipped");
  });

  it("Delivered + current shipped -> would_update to delivered", () => {
    const mapResult = mapPostExTransactionStatusToBuyNTry("Delivered");
    const preview = derivePostExStatusPreviewAction("shipped", mapResult);
    assert.equal(preview.action, "would_update");
    assert.equal(preview.proposedBuyNTryStatus, "delivered");
  });

  it("Returned -> manual_review", () => {
    const mapResult = mapPostExTransactionStatusToBuyNTry("Returned");
    const preview = derivePostExStatusPreviewAction("shipped", mapResult);
    assert.equal(preview.action, "manual_review");
    assert.equal(preview.proposedBuyNTryStatus, null);
  });

  it("Booked + current shipped -> no_change (no regression to processing)", () => {
    const mapResult = mapPostExTransactionStatusToBuyNTry("Booked");
    const preview = derivePostExStatusPreviewAction("shipped", mapResult);
    assert.equal(preview.action, "no_change");
    assert.equal(preview.proposedBuyNTryStatus, "shipped");
  });
});
