import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Order } from "@/lib/types";

import {
  buildPostExOrderPayloadFromOrder,
  buildPostExOrderDetail,
  normalizePhoneForPostEx,
  resolvePostExOperationalCityName,
  sumPostExItemCount,
} from "./postex-order-payload";

const OPERATIONAL_CITIES = ["Lahore", "Karachi", "Islamabad"];

const baseOrder = (): Order => ({
  _id: "uuid-1",
  orderId: "BNT-1001",
  createdAt: "2026-09-30T00:00:00.000Z",
  total: 5499,
  customer: {
    name: "Ali Khan",
    phone: "+92 300 1234567",
    address: "House 12, Block C, Gulberg",
    city: "Lahore",
    note: "Call before delivery",
  },
  items: [
    { name: "Smartwatch Pro", quantity: 2 },
    { name: "USB Cable", quantity: 1 },
  ],
});

describe("resolvePostExOperationalCityName", () => {
  it('maps "lahore" to canonical "Lahore"', () => {
    const result = resolvePostExOperationalCityName("lahore", OPERATIONAL_CITIES);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.cityName, "Lahore");
  });

  it('maps " LAHORE " to canonical "Lahore"', () => {
    const result = resolvePostExOperationalCityName(" LAHORE ", OPERATIONAL_CITIES);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.cityName, "Lahore");
  });

  it("rejects an unsupported city", () => {
    assert.equal(
      resolvePostExOperationalCityName("Quetta", OPERATIONAL_CITIES).ok,
      false,
    );
  });
});

describe("normalizePhoneForPostEx", () => {
  it("formats E.164 and local inputs to 03XXXXXXXXX", () => {
    assert.equal(normalizePhoneForPostEx("+923001234567"), "03001234567");
    assert.equal(normalizePhoneForPostEx("0300 123 4567"), "03001234567");
  });

  it("rejects invalid phones", () => {
    assert.equal(normalizePhoneForPostEx("123"), null);
    assert.equal(normalizePhoneForPostEx(""), null);
  });
});

describe("sumPostExItemCount", () => {
  it("sums line quantities", () => {
    assert.equal(
      sumPostExItemCount([
        { quantity: 2 },
        { quantity: 1 },
      ]),
      3,
    );
  });

  it("defaults missing quantity to 1 per line", () => {
    assert.equal(sumPostExItemCount([{ name: "A" }, { name: "B", quantity: 2 }]), 3);
  });
});

describe("buildPostExOrderDetail", () => {
  it("builds a concise quantity summary", () => {
    assert.equal(
      buildPostExOrderDetail([{ name: "Watch", quantity: 2 }, { name: "Cable", quantity: 1 }]),
      "Watch x2; Cable x1",
    );
  });
});

describe("buildPostExOrderPayloadFromOrder", () => {
  it("maps a valid order using POSTEX_PICKUP_ADDRESS_CODE", () => {
    const result = buildPostExOrderPayloadFromOrder(
      baseOrder(),
      OPERATIONAL_CITIES,
      { POSTEX_PICKUP_ADDRESS_CODE: "001" },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.cityName, "Lahore");
    assert.equal(result.payload.orderType, "Normal");
    assert.equal(result.payload.pickupAddressCode, "001");
    assert.equal(result.payload.orderRefNumber, "BNT-1001");
    assert.equal(result.payload.invoicePayment, 5499);
    assert.equal(result.payload.items, 3);
    assert.equal(result.payload.customerPhone, "03001234567");
    assert.equal(result.payload.invoiceDivision, 1);
    assert.equal(result.payload.transactionNotes, "Call before delivery");
    assert.equal(result.payload.orderDetail, "Smartwatch Pro x2; USB Cable x1");
  });

  it("normalizes lowercase order city against PostEx operational cities", () => {
    const order = baseOrder();
    order.customer = { ...order.customer, city: "lahore" };
    const result = buildPostExOrderPayloadFromOrder(order, OPERATIONAL_CITIES, {
      POSTEX_PICKUP_ADDRESS_CODE: "001",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payload.cityName, "Lahore");
  });

  it("fails when city is not a PostEx operational city", () => {
    const order = baseOrder();
    order.customer = { ...order.customer, city: "Quetta" };
    const result = buildPostExOrderPayloadFromOrder(order, OPERATIONAL_CITIES, {
      POSTEX_PICKUP_ADDRESS_CODE: "001",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(
      result.missingOrInvalid.includes("customer.city (not a PostEx operational city)"),
    );
  });

  it("lists missing required fields without inventing data", () => {
    const order = baseOrder();
    order.customer = { phone: "03001234567" };
    order.items = [];
    const result = buildPostExOrderPayloadFromOrder(order, OPERATIONAL_CITIES, {});
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.ok(result.missingOrInvalid.includes("customer.name"));
    assert.ok(result.missingOrInvalid.includes("customer.city"));
    assert.ok(result.missingOrInvalid.includes("customer.address"));
    assert.ok(result.missingOrInvalid.includes("POSTEX_PICKUP_ADDRESS_CODE"));
    assert.ok(result.missingOrInvalid.includes("order.items"));
  });
});
