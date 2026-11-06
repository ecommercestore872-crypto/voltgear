import assert from "node:assert/strict";
import { test } from "node:test";
import { runPostExCancelOrderForOrderId } from "./postex-cancel-order";
import type { Order } from "./types";

const order = { orderId: "QA-CANCEL", status: "processing", postexTrackingNumber: "PX-123" } as Order;

test("concurrent courier cancellation allows only one provider call", async () => {
  let claimed = false;
  let calls = 0;
  const deps = {
    getOrder: async () => order,
    claimCancellation: async () => { if (claimed) return null; claimed = true; return "attempt-1"; },
    cancelShipment: async () => { calls++; return { ok: true as const, upstreamHttpStatus: 200 }; },
    markConfirmed: async () => true,
  };
  const [a, b] = await Promise.all([
    runPostExCancelOrderForOrderId("QA-CANCEL", deps),
    runPostExCancelOrderForOrderId("QA-CANCEL", deps),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(calls, 1);
});

test("provider timeout leaves cancellation uncertain and locked", async () => {
  let unknown = false;
  const result = await runPostExCancelOrderForOrderId("QA-CANCEL", {
    getOrder: async () => order,
    claimCancellation: async () => "attempt-2",
    cancelShipment: async () => ({ ok: false, error: "Unknown outcome", httpStatus: 502 }),
    markUnknown: async () => { unknown = true; return true; },
  });
  assert.equal(result.status, 502);
  assert.equal(unknown, true);
});

test("provider success with failed database confirmation does not report success", async () => {
  const result = await runPostExCancelOrderForOrderId("QA-CANCEL", {
    getOrder: async () => order,
    claimCancellation: async () => "attempt-3",
    cancelShipment: async () => ({ ok: true, upstreamHttpStatus: 200 }),
    markConfirmed: async () => false,
  });
  assert.equal(result.status, 503);
  assert.equal(result.body.success, false);
});
