import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Order, OrderStatus } from "@/lib/types";

import { runPostExStatusSyncForOrderId } from "./postex-status-sync";

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  _id: "uuid-1",
  orderId: "BNT-1032",
  createdAt: "2026-09-30T00:00:00.000Z",
  total: 6499,
  status: "processing",
  postexTrackingNumber: "23736240000001",
  customer: {
    name: "Secret Customer",
    phone: "03001234567",
    email: "secret@example.com",
    address: "Secret Address",
    city: "Lahore",
  },
  items: [{ name: "Widget", quantity: 1 }],
  ...overrides,
});

function trackBody(transactionStatus: string) {
  return {
    statusCode: "200",
    dist: {
      transactionStatus,
      orderPickupDate: null,
      orderDeliveryDate: null,
      transactionDate: "2026-09-30",
      transactionStatusHistory: [],
    },
  };
}

type UpdateCall = { orderId: string; status: OrderStatus; note: string };

function deps(
  order: Order,
  postexStatus: string,
  overrides: {
    fetchTrack?: Parameters<typeof runPostExStatusSyncForOrderId>[1]["fetchTrack"];
  } = {},
) {
  const updates: UpdateCall[] = [];
  return {
    updates,
    config: {
      getOrder: async () => order,
      fetchTrack:
        overrides.fetchTrack ??
        (async () => ({
          ok: true as const,
          upstreamHttpStatus: 200,
          data: trackBody(postexStatus),
        })),
      applyStatusUpdate: async (orderId: string, status: OrderStatus, note: string) => {
        updates.push({ orderId, status, note });
        return { ok: true as const };
      },
    },
  };
}

describe("runPostExStatusSyncForOrderId", () => {
  it("Booked + processing -> no_change, zero DB writes", async () => {
    const { config, updates } = deps(baseOrder(), "Booked");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.status, 200);
    assert.equal(result.body.action, "no_change");
    assert.equal(result.body.newStatus, "processing");
    assert.equal(updates.length, 0);
  });

  it("Picked By PostEx + processing -> update to shipped with history note", async () => {
    const { config, updates } = deps(baseOrder(), "Picked By PostEx");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.status, 200);
    assert.equal(result.body.action, "updated");
    assert.equal(result.body.newStatus, "shipped");
    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.status, "shipped");
    assert.equal(updates[0]?.note, "PostEx status sync: Picked By PostEx");
  });

  it("Out For Delivery + processing -> update to shipped", async () => {
    const { config, updates } = deps(baseOrder(), "Out For Delivery");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.body.action, "updated");
    assert.equal(result.body.newStatus, "shipped");
    assert.equal(updates.length, 1);
  });

  it("Delivered + shipped -> update to delivered", async () => {
    const { config, updates } = deps(baseOrder({ status: "shipped" }), "Delivered");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.body.action, "updated");
    assert.equal(result.body.newStatus, "delivered");
    assert.equal(updates.length, 1);
  });

  it("Delivered + processing -> update to delivered", async () => {
    const { config, updates } = deps(baseOrder({ status: "processing" }), "Delivered");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.body.action, "updated");
    assert.equal(result.body.newStatus, "delivered");
    assert.equal(updates.length, 1);
  });

  it("Booked + shipped -> MUST NOT regress to processing", async () => {
    const { config, updates } = deps(baseOrder({ status: "shipped" }), "Booked");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.body.action, "no_change");
    assert.equal(result.body.newStatus, "shipped");
    assert.equal(updates.length, 0);
  });

  it("PostEx status Returned -> manual_review, no DB write", async () => {
    const { config, updates } = deps(baseOrder(), "Returned");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.status, 409);
    assert.equal(result.body.action, "manual_review");
    assert.equal(updates.length, 0);
  });

  it("unsupported status -> manual_review", async () => {
    const { config, updates } = deps(baseOrder(), "Totally Unknown Status");
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);

    assert.equal(result.status, 409);
    assert.equal(result.body.action, "manual_review");
    assert.equal(updates.length, 0);
  });

  it("returns 400 when tracking number is missing", async () => {
    let fetchCalls = 0;
    const updates: UpdateCall[] = [];
    const result = await runPostExStatusSyncForOrderId("BNT-1032", {
      getOrder: async () => baseOrder({ postexTrackingNumber: undefined }),
      fetchTrack: async () => {
        fetchCalls++;
        return { ok: true, upstreamHttpStatus: 200, data: trackBody("Booked") };
      },
      applyStatusUpdate: async (orderId, status, note) => {
        updates.push({ orderId, status, note });
        return { ok: true };
      },
    });
    assert.equal(result.status, 400);
    assert.equal(fetchCalls, 0);
    assert.equal(updates.length, 0);
  });

  it("surfaces PostEx track errors", async () => {
    const { config } = deps(baseOrder(), "Booked", {
      fetchTrack: async () => ({
        ok: false,
        error: "PostEx returned a non-JSON response",
        httpStatus: 502,
      }),
    });
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);
    assert.equal(result.status, 502);
    assert.equal(result.body.success, false);
  });

  it("does not expose tokens in response body", async () => {
    const { config } = deps(baseOrder(), "Booked", {
      fetchTrack: async () => ({
        ok: false,
        error: "Failed",
        httpStatus: 503,
      }),
    });
    const result = await runPostExStatusSyncForOrderId("BNT-1032", config);
    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("merchant-token"), false);
    assert.equal(serialized.includes("Secret Customer"), false);
  });
});
