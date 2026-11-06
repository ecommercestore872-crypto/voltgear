import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimPostExBookingRow,
  completePostExBookingRow,
  markPostExBookingUnknownRow,
  releasePostExBookingClaimRow,
} from "./postex-book-order-db";

function mockRpc(result: unknown) {
  const calls: Array<{ name: string; args: unknown }> = [];
  const client = {
    async rpc(name: string, args: unknown) {
      calls.push({ name, args });
      return { data: result, error: null };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("PostEx booking database commands", () => {
  it("returns the database-generated claim token", async () => {
    const { client, calls } = mockRpc({ ok: true, attempt_id: "QA-UUID" });
    assert.equal(await claimPostExBookingRow(client, "BNT-1", "ignored"), "QA-UUID");
    assert.deepEqual(calls, [{ name: "postex_claim_booking", args: { p_order_id: "BNT-1" } }]);
  });

  it("does not report a failed guarded completion as success", async () => {
    const { client } = mockRpc({ ok: false, reason: "conflict" });
    const result = await completePostExBookingRow(client, "BNT-1", "PX-1", "QA-UUID", "2026-11-06T00:00:00Z");
    assert.equal(result.ok, false);
  });

  it("uses the same token for release, uncertain-state and completion commands", async () => {
    const { client, calls } = mockRpc({ ok: true });
    assert.equal(await releasePostExBookingClaimRow(client, "BNT-1", "QA-UUID"), true);
    await markPostExBookingUnknownRow(client, "BNT-1", "QA-UUID");
    assert.equal((await completePostExBookingRow(client, "BNT-1", "PX-1", "QA-UUID", "2026-11-06T00:00:00Z")).ok, true);
    assert.deepEqual(calls.map((call) => call.name), [
      "postex_release_booking_preflight", "postex_mark_booking_unknown", "postex_complete_booking",
    ]);
    assert.deepEqual(calls[2]?.args, {
      p_order_id: "BNT-1", p_attempt_id: "QA-UUID", p_tracking_number: "PX-1", p_completed_at: "2026-11-06T00:00:00Z",
    });
  });
});
