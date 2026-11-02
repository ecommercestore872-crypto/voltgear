import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterPurchasableProducts,
  isPurchasablePrice,
} from "./product-price-rules";

describe("isPurchasablePrice", () => {
  it("accepts positive finite prices", () => {
    assert.equal(isPurchasablePrice(1), true);
    assert.equal(isPurchasablePrice(2399), true);
  });

  it("rejects zero, negative, and non-finite values", () => {
    assert.equal(isPurchasablePrice(0), false);
    assert.equal(isPurchasablePrice(-10), false);
    assert.equal(isPurchasablePrice(NaN), false);
    assert.equal(isPurchasablePrice("100" as unknown), false);
    assert.equal(isPurchasablePrice(null), false);
  });
});

describe("filterPurchasableProducts", () => {
  it("drops zero-price products", () => {
    const out = filterPurchasableProducts([
      { price: 0 },
      { price: 500 },
      { price: -1 },
    ]);
    assert.deepEqual(out, [{ price: 500 }]);
  });
});
