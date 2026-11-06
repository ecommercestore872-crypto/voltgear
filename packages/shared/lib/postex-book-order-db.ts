import type { SupabaseClient } from "@supabase/supabase-js";
import { scheduleOrderSheetSync } from "@/lib/order-sheet-sync";

/** Database row lock and attempt token prevent two provider creates for one order. */
export async function claimPostExBookingRow(
  client: SupabaseClient,
  orderId: string,
  _claimedAt: string,
): Promise<string | null> {
  const { data, error } = await client.rpc("postex_claim_booking", { p_order_id: orderId });
  if (error) {
    console.error("[postex-book] claim failed");
    return null;
  }
  return data?.ok === true && typeof data.attempt_id === "string" ? data.attempt_id : null;
}

export async function releasePostExBookingClaimRow(
  client: SupabaseClient,
  orderId: string,
  attemptId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("postex_release_booking_preflight", {
    p_order_id: orderId, p_attempt_id: attemptId,
  });
  if (error || data?.ok !== true) {
    console.error("[postex-book] release preflight failed");
    return false;
  }
  return true;
}

export async function markPostExBookingUnknownRow(
  client: SupabaseClient,
  orderId: string,
  attemptId: string,
): Promise<void> {
  const { data, error } = await client.rpc("postex_mark_booking_unknown", {
    p_order_id: orderId, p_attempt_id: attemptId,
  });
  if (error || data?.ok !== true) console.error("[postex-book] unknown-state update failed");
}

export async function completePostExBookingRow(
  client: SupabaseClient,
  orderId: string,
  trackingNumber: string,
  attemptId: string,
  completedAt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await client.rpc("postex_complete_booking", {
    p_order_id: orderId,
    p_attempt_id: attemptId,
    p_tracking_number: trackingNumber,
    p_completed_at: completedAt,
  });
  if (error || data?.ok !== true) {
    console.error("[postex-book] persist tracking failed");
    return { ok: false, error: "Could not save PostEx tracking on the order." };
  }
  scheduleOrderSheetSync(orderId);
  return { ok: true };
}
