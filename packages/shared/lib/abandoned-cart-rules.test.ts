import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeAbandonedCart } from "./abandoned-cart-rules";

describe("normalizeAbandonedCart", () => {
  it("normalizes an email and computes the subtotal from bounded lines", () => {
    const result = normalizeAbandonedCart({
      email: "SHOPPER@Example.com ",
      name: " Shopper ",
      subtotal: 1,
      items: [{ name: "Mini Buds", price: 2499, quantity: 2 }],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.email, "shopper@example.com");
      assert.equal(result.value.subtotal, 4998);
    }
  });

  it("rejects invalid recipient and cart data", () => {
    assert.equal(normalizeAbandonedCart({ email: "victim", items: [{}] }).ok, false);
    assert.equal(
      normalizeAbandonedCart({
        email: "shopper@example.com",
        items: [{ name: "Item", price: -1, quantity: 1 }],
      }).ok,
      false,
    );
  });
});
