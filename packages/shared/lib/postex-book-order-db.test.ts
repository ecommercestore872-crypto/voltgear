import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { claimPostExBookingRow, completePostExBookingRow } from "./postex-book-order-db";

const at = "2026-09-30T12:00:00.000Z";

function row(overrides: Record<string, unknown> = {}) {
  return { id: "fixture", order_id: "BNT-TEST", status: "new", is_demo: false,
    postex_tracking_number: null, postex_booking_claimed_at: null, ...overrides };
}

/** In-memory query contract test, not a live PostgreSQL concurrency test. */
function mockClient(order: Record<string, unknown> | null) {
  const predicates: ((row: Record<string, unknown>) => boolean)[] = [];
  let update: Record<string, unknown> = {};
  const query = {
    update(value: Record<string, unknown>) { update = value; return query; },
    eq(key: string, value: unknown) { predicates.push((r) => r[key] === value); return query; },
    is(key: string, value: unknown) { predicates.push((r) => r[key] === value); return query; },
    in(key: string, values: unknown[]) { predicates.push((r) => values.includes(r[key])); return query; },
    select(columns: string) { assert.equal(columns, "id"); return query; },
    async maybeSingle() {
      const matches = order && predicates.every((test) => test(order));
      if (matches) Object.assign(order, update);
      return { data: matches ? { id: order.id } : null, error: null };
    },
  };
  return { from(table: string) { assert.equal(table, "orders"); return query; } } as unknown as SupabaseClient;
}

describe("PostEx booking conditional writes", () => {
  it("claims only live pre-dispatch orders", async () => {
    for (const status of ["new", "processing", "shipped", "delivered", "cancelled"]) {
      for (const is_demo of [false, true]) {
        const order = row({ status, is_demo });
        const eligible = !is_demo && ["new", "processing"].includes(status);
        assert.equal(await claimPostExBookingRow(mockClient(order), "BNT-TEST", at), eligible);
        assert.equal(order.postex_booking_claimed_at, eligible ? at : null);
      }
    }
  });

  it("does not claim a booked or already claimed order", async () => {
    for (const changed of [{ postex_tracking_number: "PX-OLD" }, { postex_booking_claimed_at: "other" }]) {
      assert.equal(await claimPostExBookingRow(mockClient(row(changed)), "BNT-TEST", at), false);
    }
  });

  it("persists tracking only for the owning claim and valid status", async () => {
    const order = row({ postex_booking_claimed_at: at });
    assert.deepEqual(await completePostExBookingRow(mockClient(order), "BNT-TEST", "PX-TEST", at), { ok: true });
    assert.equal(order.status, "processing");
    assert.equal(order.postex_tracking_number, "PX-TEST");
    assert.equal(order.postex_booking_claimed_at, null);
  });

  it("preserves concurrent terminal/demo changes and returns failure on zero matched rows", async () => {
    for (const changed of [
      { status: "cancelled" }, { status: "delivered" }, { status: "shipped" },
      { is_demo: true }, { postex_booking_claimed_at: "other" }, { postex_tracking_number: "PX-OLD" },
    ]) {
      const order = row({ postex_booking_claimed_at: at, ...changed });
      const before = { ...order };
      const result = await completePostExBookingRow(mockClient(order), "BNT-TEST", "PX-NEW", at);
      assert.equal(result.ok, false);
      assert.deepEqual(order, before);
    }
    assert.equal((await completePostExBookingRow(mockClient(null), "BNT-TEST", "PX-NEW", at)).ok, false);
  });
});
