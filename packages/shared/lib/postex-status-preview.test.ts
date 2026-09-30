import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Order } from "@/lib/types";

import { runPostExStatusPreviewForOrderId } from "./postex-status-preview";

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

describe("runPostExStatusPreviewForOrderId", () => {
  it("Booked + current processing -> no_change", async () => {
    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () => baseOrder({ status: "processing" }),
      fetchTrack: async () => ({
        ok: true,
        upstreamHttpStatus: 200,
        data: trackBody("Booked"),
      }),
    });

    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.action, "no_change");
    assert.equal(result.body.currentBuyNTryStatus, "processing");
    assert.equal(result.body.proposedBuyNTryStatus, "processing");
    assert.equal(result.body.postexStatus, "Booked");
  });

  it("Picked By PostEx + current processing -> would_update to shipped", async () => {
    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () => baseOrder({ status: "processing" }),
      fetchTrack: async () => ({
        ok: true,
        upstreamHttpStatus: 200,
        data: trackBody("Picked By PostEx"),
      }),
    });

    assert.equal(result.body.action, "would_update");
    assert.equal(result.body.proposedBuyNTryStatus, "shipped");
  });

  it("Delivered + current shipped -> would_update to delivered", async () => {
    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () => baseOrder({ status: "shipped" }),
      fetchTrack: async () => ({
        ok: true,
        upstreamHttpStatus: 200,
        data: trackBody("Delivered"),
      }),
    });

    assert.equal(result.body.action, "would_update");
    assert.equal(result.body.proposedBuyNTryStatus, "delivered");
  });

  it("Returned -> manual_review", async () => {
    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () => baseOrder({ status: "shipped" }),
      fetchTrack: async () => ({
        ok: true,
        upstreamHttpStatus: 200,
        data: trackBody("Returned"),
      }),
    });

    assert.equal(result.body.action, "manual_review");
    assert.equal(result.body.proposedBuyNTryStatus, null);
  });

  it("returns 400 when tracking number is missing", async () => {
    let fetchCalls = 0;
    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () =>
        baseOrder({ postexTrackingNumber: undefined }),
      fetchTrack: async () => {
        fetchCalls++;
        return { ok: true, upstreamHttpStatus: 200, data: trackBody("Booked") };
      },
    });

    assert.equal(result.status, 400);
    assert.equal(fetchCalls, 0);
  });

  it("does not expose tokens and performs no DB writes", async () => {
    let getOrderCalls = 0;

    const result = await runPostExStatusPreviewForOrderId("BNT-1032", {
      getOrder: async () => {
        getOrderCalls++;
        return baseOrder();
      },
      fetchTrack: async () => ({
        ok: true,
        upstreamHttpStatus: 200,
        data: trackBody("Booked"),
      }),
    });

    assert.equal(getOrderCalls, 1);
    const serialized = JSON.stringify(result.body);
    assert.equal(serialized.includes("merchant-token"), false);
    assert.equal(serialized.includes("Secret Customer"), false);
  });
});
