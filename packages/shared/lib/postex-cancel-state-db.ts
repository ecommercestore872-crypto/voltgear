import { getServiceClient } from "@/lib/supabase/server";

export async function claimPostExCancellation(orderId: string, trackingNumber: string): Promise<string | null> {
  const { data, error } = await getServiceClient().rpc("postex_claim_shipment_cancellation", {
    p_order_id: orderId, p_tracking_number: trackingNumber,
  });
  if (error || data?.ok !== true || typeof data.attempt_id !== "string") return null;
  return data.attempt_id;
}

export async function markPostExCancellationUnknown(orderId: string, attemptId: string): Promise<boolean> {
  const { data, error } = await getServiceClient().rpc("postex_mark_shipment_cancel_unknown", {
    p_order_id: orderId, p_attempt_id: attemptId,
  });
  return !error && data?.ok === true;
}

export async function markPostExCancellationConfirmed(orderId: string, trackingNumber: string, attemptId: string): Promise<boolean> {
  const { data, error } = await getServiceClient().rpc("postex_mark_shipment_cancelled", {
    p_order_id: orderId, p_tracking_number: trackingNumber, p_attempt_id: attemptId,
  });
  return !error && data?.ok === true;
}
