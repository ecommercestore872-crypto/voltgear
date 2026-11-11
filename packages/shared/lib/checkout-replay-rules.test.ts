import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkoutReplayMatches } from "./checkout-replay-rules";
import type { Order } from "./types";

const customer = {
  name: "Ali Khan",
  email: "cod.923001234567@orders.buyntryy.com",
  phone: "+923001234567",
  address: "House 12, Street 4, DHA",
  province: "punjab" as const,
  city: "Lahore",
};
const body = {
  customer,
  items: [{ slug: "charger", quantity: 2, variantKey: "black", price: 1500 }],
  payment: { method: "cod" },
};
const order: Order = {
  _id: "test",
  orderId: "BNT-1",
  createdAt: "2026-01-01T00:00:00Z",
  customer,
  items: [{ slug: "charger", quantity: 2, variantKey: "black", price: 1500 }],
  payment: "cod",
  total: 3200,
};

describe("checkout replay", () => {
  it("replays the same intent even after product price changes", () => {
    assert.equal(checkoutReplayMatches(order, { ...body, items: [{ ...body.items[0], price: 1700 }] }, customer), true);
  });
  it("rejects a changed delivery address or cart", () => {
    assert.equal(checkoutReplayMatches(order, body, { ...customer, address: "Another Street 45" }), false);
    assert.equal(checkoutReplayMatches(order, { ...body, items: [{ ...body.items[0], quantity: 3 }] }, customer), false);
  });
});
