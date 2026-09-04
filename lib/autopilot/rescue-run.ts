import { RESCUE_BATCH_LIMIT } from "@/lib/autopilot/config";
import { extractPostExRawStatus, orderStatusFromCourier } from "@/lib/autopilot/rescue-rules";
import { normalizeCourierStatus } from "@/lib/autopilot/rescue-engine";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { appendOrderHistoryNote, getAllOrders, updateOrderStatusRow } from "@/lib/db/store";
import { trackPostExOrder } from "@/lib/postex";
import type { Order } from "@/lib/types";

export type RescueRunItem = {
  orderId: string;
  ok: boolean;
  rawStatus: string;
  changed: boolean;
  reason: string;
};

export async function refreshOneTracking(order: Order): Promise<RescueRunItem> {
  const tn = (order.postexTrackingNumber ?? "").trim();
  if (!tn) {
    return { orderId: order.orderId, ok: true, rawStatus: "", changed: false, reason: "No tracking number" };
  }
  if (order.status === "delivered" || order.status === "cancelled") {
    return { orderId: order.orderId, ok: true, rawStatus: "", changed: false, reason: "Already closed" };
  }
  const tracked = await trackPostExOrder(tn);
  if (!tracked.ok) {
    return { orderId: order.orderId, ok: false, rawStatus: "", changed: false, reason: tracked.error };
  }
  const raw = extractPostExRawStatus(tracked.data) || tracked.rawStatus;
  const normalized = normalizeCourierStatus(raw, "POSTEX");
  const next = orderStatusFromCourier(normalized);
  await appendOrderHistoryNote(order.orderId, `PostEx status: ${normalized}${raw ? ` (${raw.slice(0, 80)})` : ""}`);
  if (next && next !== order.status) {
    await updateOrderStatusRow(order.orderId, next, `Courier reported ${normalized}.`);
    if (order.customer?.email) {
      await sendOrderStatusUpdateEmail(order.customer.email, {
        orderId: order.orderId,
        name: order.customer.name || "there",
        status: next,
        note: `Courier: ${normalized}`,
      });
    }
    return { orderId: order.orderId, ok: true, rawStatus: raw, changed: true, reason: `Marked ${next}` };
  }
  return { orderId: order.orderId, ok: true, rawStatus: raw, changed: false, reason: normalized };
}

export async function runAutoRescue(limit = RESCUE_BATCH_LIMIT): Promise<RescueRunItem[]> {
  const orders = (await getAllOrders()).filter(
    (o) => !o.isDemo && (o.postexTrackingNumber ?? "").trim() && o.status === "shipped"
  );
  const out: RescueRunItem[] = [];
  for (const order of orders.slice(0, limit)) {
    out.push(await refreshOneTracking(order));
  }
  return out;
}
