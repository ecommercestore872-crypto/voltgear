import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";

import { stableCheckoutIntentString } from "./checkout-intent";

const base = {
  customer: {
    name: "Ayesha Khan",
    email: "AYESHA@example.com",
    phone: "+923001234567",
    address: "10 Main Street",
    city: "Lahore",
    postal: "54000",
    note: "Call before delivery",
  },
  items: [{ slug: "mini-buds", variantKey: "black", quantity: 1, price: 2499, lineTotal: 2499 }],
  paymentMethod: "cod",
  giftWrap: false,
  promoCode: null,
  subtotal: 2499,
  shipping: 0,
  discount: 0,
  total: 2499,
};

function fingerprint(value: typeof base): string {
  return crypto.createHash("sha256").update(stableCheckoutIntentString(value)).digest("hex");
}

describe("checkout intent fingerprint", () => {
  it("is deterministic when item input order changes", () => {
    const reversed = { ...base, items: [...base.items].reverse() };
    assert.equal(stableCheckoutIntentString(base), stableCheckoutIntentString(reversed));
    assert.equal(fingerprint(base), fingerprint(reversed));
  });

  it("changes for address, identity, cart, promo, totals, gift wrap, and notes", () => {
    const changes = [
      { ...base, customer: { ...base.customer, address: "11 Main Street" } },
      { ...base, customer: { ...base.customer, phone: "+923009999999" } },
      { ...base, items: [{ ...base.items[0], quantity: 2 }], subtotal: 4998, total: 4998 },
      { ...base, promoCode: "BNT10", discount: 249.9, total: 2249.1 },
      { ...base, giftWrap: true, shipping: 149, total: 2648 },
      { ...base, customer: { ...base.customer, note: "Leave at the gate" } },
    ];
    for (const changed of changes) assert.notEqual(fingerprint(base), fingerprint(changed));
  });

  it("normalizes harmless casing and whitespace", () => {
    const equivalent = {
      ...base,
      customer: {
        ...base.customer,
        name: "  Ayesha   Khan ",
        email: "ayesha@example.com",
      },
    };
    assert.equal(fingerprint(base), fingerprint(equivalent));
  });
});
