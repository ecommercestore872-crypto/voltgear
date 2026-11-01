import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeCheckoutCustomer,
  normalizePhoneForCheckout,
  resolveCheckoutEmail,
} from "./checkout-customer-rules";

describe("checkout-customer-rules", () => {
  it("accepts COD payload without email when delivery location is complete", () => {
    const r = normalizeCheckoutCustomer({
      name: "Ali Khan",
      phone: "03001234567",
      address: "House 12, Street 4, DHA Phase 5",
      province: "punjab",
      city: "Lahore",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.customer.email, /^cod\./);
    assert.equal(r.customer.city, "Lahore");
    assert.equal(r.customer.province, "punjab");
    assert.equal(r.customer.phone, "+923001234567");
  });

  it("keeps real email when provided", () => {
    const email = resolveCheckoutEmail("buyer@example.com", "+923001234567");
    assert.equal(email, "buyer@example.com");
  });

  it("lenient phone accepts spaced local format", () => {
    assert.equal(normalizePhoneForCheckout("0300 123 4567"), "+923001234567");
  });

  it("rejects missing address", () => {
    const r = normalizeCheckoutCustomer({
      name: "Ali",
      phone: "03001234567",
      address: "123",
    });
    assert.equal(r.ok, false);
  });

  it("rejects missing province or city", () => {
    const base = { name: "Ali Khan", phone: "03001234567", address: "House 12, Street 4" };
    assert.equal(normalizeCheckoutCustomer({ ...base, city: "Lahore" }).ok, false);
    assert.equal(normalizeCheckoutCustomer({ ...base, province: "punjab" }).ok, false);
  });
});
