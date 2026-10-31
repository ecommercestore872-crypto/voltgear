import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeCheckoutCustomer,
  normalizePhoneForCheckout,
  resolveCheckoutEmail,
} from "./checkout-customer-rules";

describe("checkout-customer-rules", () => {
  it("requires province and city for COD", () => {
    const missing = normalizeCheckoutCustomer({
      name: "Ali Khan",
      phone: "03001234567",
      address: "House 12, Street 4, DHA Phase 5",
    });
    assert.equal(missing.ok, false);

    const r = normalizeCheckoutCustomer({
      name: "Ali Khan",
      phone: "03001234567",
      address: "House 12, Street 4, DHA Phase 5",
      province: "PB",
      cityId: "lahore",
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.match(r.customer.email, /^cod\./);
    assert.equal(r.customer.city, "Lahore");
    assert.equal(r.customer.province, "PB");
    assert.equal(r.customer.cityId, "lahore");
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
      province: "PB",
      cityId: "lahore",
    });
    assert.equal(r.ok, false);
  });
});
