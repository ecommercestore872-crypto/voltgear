import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import {
  buildOrderSheetSyncPayload,
  resolveOrderSheetSyncEndpoint,
  signOrderSheetSyncPayload,
} from "./order-sheet-sync-rules";
import type { Order } from "./types";

const order: Order = {
  _id: "db-1",
  orderId: "BNT-1201",
  createdAt: "2026-10-21T05:00:00.000Z",
  statusUpdatedAt: "2026-10-21T05:01:00.000Z",
  status: "processing",
  payment: "cod",
  subtotal: 5500,
  shipping: 250,
  discount: 500,
  total: 5250,
  promoCode: "SAVE500",
  customer: {
    name: "A Customer",
    email: "buyer@example.com",
    phone: "+923001234567",
    city: "Lahore",
    address: "Street 1",
    postal: "54000",
  },
  postexTrackingNumber: "PX-123",
  items: [
    {
      slug: "charger",
      name: "Fast Charger",
      quantity: 2,
      price: 1500,
      lineTotal: 3000,
      variantSku: "FC-BLK",
      variantName: "Black",
    },
    {
      slug: "cable",
      name: "USB Cable",
      quantity: 1,
      price: 2500,
      lineTotal: 2500,
    },
  ],
};

describe("order sheet synchronization rules", () => {
  it("maps a canonical order and creates stable per-item submission IDs", () => {
    const first = buildOrderSheetSyncPayload(order, {
      eventId: "event-1",
      syncedAt: "2026-10-21T05:02:00.000Z",
    });
    const second = buildOrderSheetSyncPayload(
      { ...order, items: [...(order.items ?? [])].reverse() },
      { eventId: "event-2", syncedAt: "2026-10-21T05:03:00.000Z" },
    );

    assert.equal(first.order.status, "Processing");
    assert.equal(first.order.source, "Website");
    assert.equal(first.order.courier, "PostEx");
    assert.equal(first.order.items.length, 2);
    assert.deepEqual(
      first.order.items.map((item) => item.submissionId),
      second.order.items.map((item) => item.submissionId),
    );
    assert.equal(first.order.items.reduce((sum, item) => sum + item.lineTotal, 0), 5500);
  });

  it("never synchronizes demo or empty orders", () => {
    assert.throws(() => buildOrderSheetSyncPayload({ ...order, isDemo: true }), /Demo orders/);
    assert.throws(() => buildOrderSheetSyncPayload({ ...order, items: [] }), /At least one/);
  });

  it("signs the exact encoded payload consumed by Apps Script", () => {
    const payload = buildOrderSheetSyncPayload(order, {
      eventId: "event-1",
      syncedAt: "2026-10-21T05:02:00.000Z",
    });
    const secret = "0123456789abcdef0123456789abcdef";
    const envelope = signOrderSheetSyncPayload(payload, secret, {
      timestamp: 1792558920000,
      nonce: "nonce-1",
    });
    const expected = createHmac("sha256", secret)
      .update(`${envelope.timestamp}.${envelope.nonce}.${envelope.payloadBase64}`)
      .digest("base64url");
    assert.equal(envelope.signature, expected);
    assert.deepEqual(
      JSON.parse(Buffer.from(envelope.payloadBase64, "base64url").toString("utf8")),
      payload,
    );
  });

  it("accepts only deployed Apps Script HTTPS endpoints", () => {
    assert.equal(resolveOrderSheetSyncEndpoint(undefined), null);
    assert.equal(
      resolveOrderSheetSyncEndpoint("https://script.google.com/macros/s/abc_123/exec"),
      "https://script.google.com/macros/s/abc_123/exec",
    );
    assert.throws(() => resolveOrderSheetSyncEndpoint("https://example.com/hook"), /Apps Script/);
  });
});
