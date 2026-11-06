import assert from "node:assert/strict";
import { test } from "node:test";
import { runPostExStatusSyncForOrderId } from "./postex-status-sync";
import { parsePostExEventTimestamp } from "./postex-tracking-rules";
import type { Order } from "./types";

const order = { orderId: "QA-1", status: "processing", postexTrackingNumber: "PX-1" } as Order;

test("tracking snapshot records provider data and advances through one atomic writer", async () => {
  let legacyWrites = 0;
  let recorded: Record<string, unknown> | null = null;
  const result = await runPostExStatusSyncForOrderId("QA-1", {
    getOrder: async () => order,
    fetchTrack: async () => ({ ok: true, upstreamHttpStatus: 200, data: {
      statusCode: "200", dist: { transactionStatus: "Delivered", transactionDate: "2026-11-06T09:00:00Z", transactionStatusHistory: [{ transactionStatusMessage: "Delivered", transactionStatusMessageCode: "D" }] },
    } }),
    applyStatusUpdate: async () => { legacyWrites++; return { ok: true }; },
    recordSnapshot: async (snapshot) => { recorded = snapshot; return { ok: true, inserted: true, advanced: true, status: "delivered" }; },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.action, "updated");
  assert.equal(legacyWrites, 0);
  assert.equal(recorded?.normalizedStatus, "delivered");
  assert.equal(recorded?.eventTime, "2026-11-06T09:00:00.000Z");
});

test("unknown provider status is recorded for manual review without an invented transition", async () => {
  let status: unknown = "sentinel";
  const result = await runPostExStatusSyncForOrderId("QA-1", {
    getOrder: async () => order,
    fetchTrack: async () => ({ ok: true, upstreamHttpStatus: 200, data: {
      statusCode: "200", dist: { transactionStatus: "Provider New State", transactionDate: "Nov 6", transactionStatusHistory: [] },
    } }),
    applyStatusUpdate: async () => { throw new Error("legacy update must not run"); },
    recordSnapshot: async (snapshot) => { status = snapshot.normalizedStatus; return { ok: true, inserted: true, advanced: false, status: "processing" }; },
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.action, "manual_review");
  assert.equal(status, null);
  assert.equal(parsePostExEventTimestamp("2026-11-06"), null);
});
