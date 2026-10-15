import assert from "node:assert";
import { describe, test } from "node:test";

import { buildCheckoutIdempotencyFingerprint } from "./checkout-idempotency";

const order = {
  customer: {
    name: "Test Customer",
    email: "test@example.com",
    phone: "+923001234567",
    address: "Test Street 123",
    city: "Lahore",
  },
  items: [
    {
      slug: "usb-c-charger",
      name: "USB-C Charger",
      quantity: 2,
      price: 1500,
      variantKey: "black",
    },
  ],
  payment: "cod",
  subtotal: 3000,
  shipping: 200,
  total: 3200,
};

describe("buildCheckoutIdempotencyFingerprint", () => {
  test("is stable for the same authoritative order", () => {
    assert.equal(
      buildCheckoutIdempotencyFingerprint(order),
      buildCheckoutIdempotencyFingerprint(structuredClone(order)),
    );
  });

  test("changes when the authoritative total changes", () => {
    assert.notEqual(
      buildCheckoutIdempotencyFingerprint(order),
      buildCheckoutIdempotencyFingerprint({ ...order, total: 3300 }),
    );
  });
});
