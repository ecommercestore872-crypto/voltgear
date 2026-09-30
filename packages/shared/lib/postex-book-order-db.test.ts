import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { completePostExBookingRow } from "./postex-book-order-db";

function mockOrdersUpdateClient(captured: { update?: Record<string, unknown> }) {
  const client = {
    from(table: string) {
      assert.equal(table, "orders");
      return {
        update(payload: Record<string, unknown>) {
          captured.update = payload;
          return {
            eq(_col: string, _orderId: string) {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
  return client as unknown as SupabaseClient;
}

describe("completePostExBookingRow", () => {
  it("persists tracking and sets status to processing after PostEx create-order", async () => {
    const captured: { update?: Record<string, unknown> } = {};
    const client = mockOrdersUpdateClient(captured);
    const at = "2026-09-30T12:00:00.000Z";

    const result = await completePostExBookingRow(
      client,
      "BNT-1001",
      "23736240000001",
      at,
    );

    assert.equal(result.ok, true);
    assert.deepEqual(captured.update, {
      postex_tracking_number: "23736240000001",
      status: "processing",
      status_updated_at: at,
      postex_booking_claimed_at: null,
    });
  });
});
