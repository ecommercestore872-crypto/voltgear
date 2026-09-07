import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyPromoToTotals,
  normalizePromoCode,
  validatePromoAdminInput,
} from "./promo-rules";

describe("normalizePromoCode", () => {
  it("uppercases and strips spaces", () => {
    assert.equal(normalizePromoCode(" ramadan 10 "), "RAMADAN10");
  });
});

describe("validatePromoAdminInput", () => {
  it("rejects percent over 100", () => {
    const r = validatePromoAdminInput({
      code: "BIG",
      type: "percent",
      value: 120,
    });
    assert.equal(r.ok, false);
  });

  it("accepts free_shipping", () => {
    const r = validatePromoAdminInput({
      code: "FREESHIP",
      type: "free_shipping",
      value: 0,
    });
    assert.equal(r.ok, true);
  });
});

describe("applyPromoToTotals", () => {
  const base = {
    code: "SAVE10",
    type: "percent" as const,
    value: 10,
    firstOrderOnly: false,
    active: true,
    startsAt: null,
    endsAt: null,
  };

  it("applies percent off subtotal", () => {
    const r = applyPromoToTotals(base, {
      subtotal: 1000,
      shipping: 200,
      isFirstOrder: true,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.discount, 100);
      assert.equal(r.shipping, 200);
      assert.equal(r.total, 1100);
    }
  });

  it("zeros shipping for free_shipping", () => {
    const r = applyPromoToTotals(
      { ...base, code: "SHIP", type: "free_shipping", value: 0 },
      { subtotal: 500, shipping: 250, isFirstOrder: true }
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.shipping, 0);
      assert.equal(r.discount, 250);
      assert.equal(r.total, 500);
    }
  });

  it("blocks first-order-only for returning buyers", () => {
    const r = applyPromoToTotals(
      { ...base, firstOrderOnly: true },
      { subtotal: 1000, shipping: 0, isFirstOrder: false }
    );
    assert.equal(r.ok, false);
  });

  it("blocks codes that hit maxUsage", () => {
    const r = applyPromoToTotals(
      { ...base, maxUsage: 10, usageCount: 10 },
      { subtotal: 1000, shipping: 0, isFirstOrder: true }
    );
    assert.equal(r.ok, false);
  });
});
