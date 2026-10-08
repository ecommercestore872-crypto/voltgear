import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeCheckoutBusinessError } from "./checkout-rpc-rules";

describe("safeCheckoutBusinessError", () => {
  it("turns known database outcomes into useful shopper messages", () => {
    assert.equal(
      safeCheckoutBusinessError("Insufficient stock for private-product-slug"),
      "One or more items no longer have enough stock.",
    );
    assert.equal(
      safeCheckoutBusinessError("IDEMPOTENCY_CONFLICT"),
      "This checkout request was already used for a different cart. Please refresh and try again.",
    );
  });

  it("does not expose unknown database details", () => {
    const detail = "constraint orders_private_internal_key failed";
    const result = safeCheckoutBusinessError(detail);

    assert.equal(
      result,
      "We could not place this order with the selected items.",
    );
    assert.equal(result.includes(detail), false);
  });
});
