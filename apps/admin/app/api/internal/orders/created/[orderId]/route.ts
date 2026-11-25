import { NextResponse } from "next/server";

import { sendAdminPush } from "@/lib/admin-push";
import { isCronAuthorized } from "@/lib/deploy-rules";
import { getOrderById } from "@/lib/order-store";
import { formatPrice } from "@/lib/utils";
import { requestOrderConfirmation } from "@/lib/whatsapp-confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server: the shop calls this after a real order is saved.
 * Authorization: Bearer CRON_SECRET. Sends the owner push and the customer WhatsApp confirm request.
 */
export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orderId = (await context.params).orderId?.trim();
  const order = orderId ? await getOrderById(orderId) : null;
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.isDemo) return NextResponse.json({ ok: true, skipped: "demo" });

  const [push, whatsapp] = await Promise.all([
    sendAdminPush({
      title: `New order ${order.orderId}`,
      body: `${order.customer?.name || "Customer"} - ${formatPrice(order.total ?? 0)}`,
      url: "/admin/orders?tab=new",
      tag: `order-${order.orderId}`,
    }),
    requestOrderConfirmation(order.orderId).catch((error) => {
      console.error("[order-created] whatsapp request failed:", error);
      return { sent: false, reason: "error" };
    }),
  ]);
  return NextResponse.json({ ok: true, push, whatsapp });
}
