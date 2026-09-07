import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOrderBillLines,
  buildOrderProgressSteps,
  resolveOrderSubtotal,
} from "./order-bill-rules";

describe("resolveOrderSubtotal", () => {
  it("prefers the stored subtotal", () => {
    assert.equal(
      resolveOrderSubtotal({
        subtotal: 5000,
        items: [{ price: 1000, quantity: 1 }],
      }),
      5000
    );
  });

  it("sums lines when subtotal is missing", () => {
    assert.equal(
      resolveOrderSubtotal({
        items: [
          { price: 1000, quantity: 2 },
          { price: 500, quantity: 1 },
        ],
      }),
      2500
    );
  });
});

describe("buildOrderBillLines", () => {
  it("builds a full COD bill with discount and free shipping", () => {
    const lines = buildOrderBillLines({
      orderId: "VG-1",
      items: [{ name: "Watch", price: 24999, quantity: 1 }],
      subtotal: 24999,
      shipping: 0,
      discount: 500,
      promoCode: "BNT10",
      total: 24499,
    });
    assert.deepEqual(
      lines.map((l) => l.key),
      ["subtotal", "discount", "shipping", "total"]
    );
    assert.equal(lines.find((l) => l.key === "discount")?.amount, -500);
    assert.equal(lines.find((l) => l.key === "shipping")?.free, true);
    assert.match(lines.find((l) => l.key === "discount")?.label ?? "", /BNT10/);
  });

  it("includes gift wrap when charged", () => {
    const lines = buildOrderBillLines({
      orderId: "VG-1",
      items: [{ name: "Watch", price: 1000, quantity: 1 }],
      subtotal: 1000,
      shipping: 199,
      giftWrapFee: 199,
      total: 1398,
    });
    assert.equal(lines.some((l) => l.key === "gift"), true);
  });
});

describe("buildOrderProgressSteps", () => {
  it("marks shipped as current when the order has shipped", () => {
    const steps = buildOrderProgressSteps("shipped");
    assert.equal(steps.find((s) => s.key === "shipped")?.state, "current");
    assert.equal(steps.find((s) => s.key === "new")?.state, "complete");
    assert.equal(steps.find((s) => s.key === "delivered")?.state, "upcoming");
  });

  it("handles cancelled without pretending it is still processing", () => {
    const steps = buildOrderProgressSteps("cancelled");
    assert.equal(steps.length, 2);
    assert.equal(steps[1]?.key, "cancelled");
    assert.equal(steps[1]?.state, "current");
  });
});
