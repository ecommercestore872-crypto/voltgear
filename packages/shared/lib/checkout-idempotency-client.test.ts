import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkoutCartFingerprint } from "./checkout-idempotency-client";

describe("checkout cart idempotency fingerprint", () => {
  it("is stable for the same cart and includes variants", () => {
    const items = [{ slug: "shirt", quantity: 2, variantKey: "blue|m" }];
    assert.equal(checkoutCartFingerprint(items), checkoutCartFingerprint(items));
    assert.notEqual(
      checkoutCartFingerprint(items),
      checkoutCartFingerprint([{ ...items[0], variantKey: "red|m" }]),
    );
  });

  it("changes when quantities or lines change", () => {
    const base = [{ slug: "shirt", quantity: 1 }];
    assert.notEqual(
      checkoutCartFingerprint(base),
      checkoutCartFingerprint([{ slug: "shirt", quantity: 2 }]),
    );
    assert.notEqual(
      checkoutCartFingerprint(base),
      checkoutCartFingerprint([{ ...base[0] }, { slug: "cap", quantity: 1 }]),
    );
  });
});
