import type { SupabaseClient } from "@supabase/supabase-js";

/** Atomic claim: only one concurrent book request may proceed per order. */
export async function claimPostExBookingRow(
  client: SupabaseClient,
  orderId: string,
  claimedAt: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("orders")
    .update({ postex_booking_claimed_at: claimedAt })
    .eq("order_id", orderId)
    .is("postex_tracking_number", null)
    .is("postex_booking_claimed_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[postex-book] claim update failed:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function releasePostExBookingClaimRow(
  client: SupabaseClient,
  orderId: string,
): Promise<void> {
  const { error } = await client
    .from("orders")
    .update({ postex_booking_claimed_at: null })
    .eq("order_id", orderId)
    .is("postex_tracking_number", null);

  if (error) {
    console.error("[postex-book] release claim failed:", error.message);
  }
}

export async function completePostExBookingRow(
  client: SupabaseClient,
  orderId: string,
  trackingNumber: string,
  shippedAt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await client
    .from("orders")
    .update({
      postex_tracking_number: trackingNumber,
      status: "processing",
      status_updated_at: shippedAt,
      postex_booking_claimed_at: null,
    })
    .eq("order_id", orderId);

  if (error) {
    console.error("[postex-book] persist tracking failed:", error.message);
    return { ok: false, error: "Could not save PostEx tracking on the order." };
  }

  return { ok: true };
}
