import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Order } from "@/lib/types";

import { classifyDispatch } from "./dispatch-rules";
import { parseAutopilotConfig } from "./config";
import { orderStatusFromCourier } from "./rescue-rules";
import { parseSettlementCsv } from "./settlement-csv";

function order(partial: Partial<Order>): Order {
  return {
    _id: "1",
    orderId: "VG-1",
    createdAt: new Date().toISOString(),
    status: "new",
    total: 1999,
    customer: {
      name: "Ali",
      phone: "03001234567",
      address: "House 1 Street 2",
      city: "Lahore",
    },
    items: [{ name: "Charger", price: 1999, quantity: 1 }],
    ...partial,
  };
}

describe("classifyDispatch", () => {
  it("books a valid new COD order", () => {
    const d = classifyDispatch(order({}), []);
    assert.equal(d.action, "book");
  });

  it("skips demo, tracked, and shipped orders", () => {
    assert.equal(classifyDispatch(order({ isDemo: true }), []).action, "skip");
    assert.equal(
      classifyDispatch(order({ postexTrackingNumber: "PE-1" }), []).action,
      "skip"
    );
    assert.equal(classifyDispatch(order({ status: "shipped" }), []).action, "skip");
  });

  it("holds a short address or bad phone", () => {
    assert.equal(
      classifyDispatch(order({ customer: { phone: "03001234567", address: "x", city: "Lahore" } }), [])
        .action,
      "hold"
    );
    assert.equal(
      classifyDispatch(
        order({ customer: { phone: "12", address: "House 1 Street 2", city: "Lahore" } }),
        []
      ).action,
      "hold"
    );
  });
});

describe("parseAutopilotConfig", () => {
  it("defaults both engines off", () => {
    assert.deepEqual(parseAutopilotConfig(null), { autoDispatch: false, autoRescue: false });
    assert.equal(parseAutopilotConfig({ autoDispatch: true }).autoDispatch, true);
  });
});

describe("orderStatusFromCourier", () => {
  it("only auto-marks delivered", () => {
    assert.equal(orderStatusFromCourier("DELIVERED"), "delivered");
    assert.equal(orderStatusFromCourier("IN_TRANSIT"), null);
    assert.equal(orderStatusFromCourier("RETURNED"), null);
  });
});

describe("parseSettlementCsv", () => {
  it("reads tracking, collected, and fee", () => {
    const rows = parseSettlementCsv("tracking,collected,fee\nPE-1,1999,200\n");
    assert.deepEqual(rows, [{ trackingNumber: "PE-1", collectedCod: 1999, chargedShippingFee: 200 }]);
  });
});
