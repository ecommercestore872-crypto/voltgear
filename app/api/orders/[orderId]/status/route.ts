import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  isAllowedOrderStatus,
  ORDER_STATUS_VALUES,
} from "@/lib/db/order-rules";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { getOrderById, updateOrderStatus } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: update an order's status and notify the customer by email.
 *
 *   curl -X POST http://localhost:3001/api/orders/VG-XXXXXXXX/status \
 *     -H "Authorization: Bearer <ADMIN_TOKEN>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"status":"shipped","note":"Tracking: PKG-123456"}'
 *
 * Sends the matching status email (shipped / delivered / cancelled / …).
 * The `new` status never emails — the confirmation is sent at checkout.
 */
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  const note = typeof body?.note === "string" ? body.note.trim() : undefined;

  if (!isAllowedOrderStatus(status)) {
    return NextResponse.json(
      {
        error: `Status must be one of: ${ORDER_STATUS_VALUES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let updated;
  if (status === "cancelled") {
    const { cancelOrder } = await import("@/lib/order-store");
    const cancelRes = await cancelOrder(orderId, note);
    if (!cancelRes.ok) {
      return NextResponse.json(
        { error: cancelRes.error || "Could not cancel the order." },
        { status: 500 },
      );
    }
    updated = await getOrderById(orderId);
  } else {
    updated = await updateOrderStatus(orderId, status, note);
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Could not update the order. Please try again." },
      { status: 500 },
    );
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (status !== "new" && order.customer?.email) {
    try {
      emailSent = await sendOrderStatusUpdateEmail(order.customer.email, {
        orderId,
        name: order.customer.name || "there",
        status,
        note,
        total: order.total,
      });
    } catch (err) {
      emailError = err instanceof Error ? err.message : "send failed";
    }
  }

  return NextResponse.json({
    ok: true,
    order: {
      orderId,
      status: updated.status,
      statusUpdatedAt: updated.statusUpdatedAt,
      statusHistory: updated.statusHistory,
    },
    email: emailSent
      ? "sent"
      : status === "new"
        ? "skipped (new)"
        : emailError
          ? `failed: ${emailError}`
          : "not sent (no email on order)",
  });
}
