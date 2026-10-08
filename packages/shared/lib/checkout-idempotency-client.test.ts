import { checkoutCartFingerprint } from "./checkout-idempotency-client";

describe("checkout cart idempotency fingerprint", () => {
  it("is stable for the same cart and includes variants", () => {
    const items = [{ slug: "shirt", quantity: 2, variantKey: "blue|m" }];
    expect(checkoutCartFingerprint(items)).toBe(checkoutCartFingerprint(items));
    expect(checkoutCartFingerprint(items)).not.toBe(
      checkoutCartFingerprint([{ ...items[0], variantKey: "red|m" }]),
    );
  });

  it("changes when quantities or lines change", () => {
    const base = [{ slug: "shirt", quantity: 1 }];
    expect(checkoutCartFingerprint(base)).not.toBe(
      checkoutCartFingerprint([{ slug: "shirt", quantity: 2 }]),
    );
    expect(checkoutCartFingerprint(base)).not.toBe(
      checkoutCartFingerprint([{ ...base[0] }, { slug: "cap", quantity: 1 }]),
    );
  });
});
