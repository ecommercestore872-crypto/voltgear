import { getServiceClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";
import type { PostExTrackingSnapshot } from "@/lib/postex-tracking-rules";

export async function recordPostExTrackingSnapshot(input: PostExTrackingSnapshot): Promise<
  { ok: true; inserted: boolean; advanced: boolean; status: OrderStatus } |
  { ok: false; error: string }
> {
  const { data, error } = await getServiceClient().rpc("postex_record_tracking_snapshot", {
    p_order_id: input.orderId,
    p_tracking_number: input.trackingNumber,
    p_provider_status: input.rawStatus,
    p_normalized_status: input.normalizedStatus,
    p_provider_event_at: input.eventTime,
    p_provider_history: input.history,
  });
  if (error || data?.ok !== true) {
    console.error("[postex-tracking] snapshot write failed", { code: error?.code ?? "unknown" });
    return { ok: false, error: "Could not save PostEx tracking." };
  }
  return {
    ok: true,
    inserted: data.inserted === true,
    advanced: data.advanced === true,
    status: data.status as OrderStatus,
  };
}

export async function listPostExTrackingSnapshots(orderId: string, limit = 30) {
  const client = getServiceClient();
  const { data: order, error: orderError } = await client.from("orders")
    .select("id, postex_tracking_number, postex_last_synced_at, postex_latest_raw_status")
    .eq("order_id", orderId).maybeSingle();
  if (orderError || !order) return null;
  const { data, error } = await client.from("postex_tracking_events")
    .select("provider_status, normalized_status, provider_event_at, received_at, provider_history")
    .eq("order_id", order.id).order("received_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 50));
  if (error) return null;
  return {
    trackingNumber: order.postex_tracking_number,
    lastSyncedAt: order.postex_last_synced_at,
    latestProviderStatus: order.postex_latest_raw_status,
    events: (data ?? []).map((row) => ({
      providerStatus: row.provider_status,
      normalizedStatus: row.normalized_status,
      providerEventAt: row.provider_event_at,
      receivedAt: row.received_at,
      providerHistory: row.provider_history,
    })),
  };
}
