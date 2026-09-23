import { classifyDispatch } from "@/lib/autopilot/dispatch-rules";
import { DISPATCH_BATCH_LIMIT } from "@/lib/autopilot/config";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { createPostExOrder, postExConfigured } from "@/lib/postex";
import { appendOrderHistoryNote, getAllOrders, getOrderByPublicId } from "@/lib/db/store";
import { getServiceClient } from "@/lib/supabase/server";
import { validateOrderForAutopilot } from "@/lib/autopilot/validator";
import type { Order } from "@/lib/types";

export type DispatchRunItem = {
  orderId: string;
  action: "book" | "skip" | "hold";
  ok: boolean;
  reason: string;
  trackingNumber?: string;
};

export function listDispatchQueue(orders: Order[]): {
  ready: Order[];
  hold: { order: Order; reason: string }[];
} {
  const ready: Order[] = [];
  const hold: { order: Order; reason: string }[] = [];
  for (const order of orders) {
    const d = classifyDispatch(order, orders);
    if (d.action === "book") ready.push(order);
    if (d.action === "hold") hold.push({ order, reason: d.reason });
  }
  return { ready, hold };
}

export async function fulfillOrderWithPostEx(order: Order, recent: Order[]): Promise<DispatchRunItem> {
  const decision = classifyDispatch(order, recent);
  if (decision.action !== "book") {
    return { orderId: order.orderId, action: decision.action, ok: true, reason: decision.reason };
  }
  if (!postExConfigured()) {
    return {
      orderId: order.orderId,
      action: "hold",
      ok: false,
      reason: "POSTEX_API_TOKEN is not set.",
    };
  }
  const v = validateOrderForAutopilot(order, recent);
  const customer = order.customer || {};
  const result = await createPostExOrder({
    orderRefNumber: order.orderId,
    invoicePayment: v.commercialSnapshot.codReceivable,
    customerName: customer.name || "Customer",
    customerPhone: v.normalizedPhone || customer.phone || "",
    deliveryAddress: [customer.address, customer.city].filter(Boolean).join(", "),
    cityName: v.courierCityCode || customer.city || "Lahore",
    orderDetail: (order.items || []).map((i) => `${i.name || "Item"} x${i.quantity || 1}`).join("; "),
    items: order.items?.length || 1,
  });
  if (!result.ok) {
    await appendOrderHistoryNote(order.orderId, `Autopilot book failed: ${result.error}`);
    return { orderId: order.orderId, action: "book", ok: false, reason: result.error };
  }
  const now = new Date().toISOString();
  const { error } = await getServiceClient()
    .from("orders")
    .update({
      postex_tracking_number: result.trackingNumber,
      status: "shipped",
      status_updated_at: now,
    })
    .eq("order_id", order.orderId);
  if (error) {
    return {
      orderId: order.orderId,
      action: "book",
      ok: false,
      reason: `PostEx booked ${result.trackingNumber} but the order row failed to update.`,
      trackingNumber: result.trackingNumber,
    };
  }
  await appendOrderHistoryNote(order.orderId, `PostEx booked. Tracking ${result.trackingNumber}.`);
  if (customer.email) {
    await sendOrderStatusUpdateEmail(customer.email, {
      orderId: order.orderId,
      name: customer.name || "there",
      status: "shipped",
      note: `Tracking: ${result.trackingNumber}`,
    });
  }
  return {
    orderId: order.orderId,
    action: "book",
    ok: true,
    reason: "Booked",
    trackingNumber: result.trackingNumber,
  };
}

export async function runAutoDispatch(limit = DISPATCH_BATCH_LIMIT): Promise<DispatchRunItem[]> {
  const orders = await getAllOrders();
  const { ready } = listDispatchQueue(orders);
  const out: DispatchRunItem[] = [];
  for (const order of ready.slice(0, limit)) {
    const fresh = (await getOrderByPublicId(order.orderId)) ?? order;
    out.push(await fulfillOrderWithPostEx(fresh, orders));
  }
  return out;
}
