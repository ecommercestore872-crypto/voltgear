import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCustomerRowsFromOrders } from "./customer-list";

describe("buildCustomerRowsFromOrders", () => {
  it("merges by email and skips demo", () => {
    const rows = buildCustomerRowsFromOrders([
      {
        orderId: "VG-1",
        createdAt: "2026-01-01T00:00:00Z",
        customer: { name: "Ali", email: "Ali@Ex.com", phone: "1" },
      },
      {
        orderId: "VG-2",
        createdAt: "2026-02-01T00:00:00Z",
        customer: { name: "Ali K", email: "ali@ex.com", phone: "1" },
      },
      {
        orderId: "VG-D",
        createdAt: "2026-03-01T00:00:00Z",
        isDemo: true,
        customer: { name: "Demo", email: "d@ex.com" },
      },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].orderCount, 2);
    assert.equal(rows[0].lastOrderId, "VG-2");
    assert.equal(rows[0].email, "Ali@Ex.com");
  });
});
