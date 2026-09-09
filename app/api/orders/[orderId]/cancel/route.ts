import { NextResponse } from "next/server";

import {
  SHOPPER_CANCEL_NOTE,
  SHOPPER_NOT_FOUND_MESSAGE,
  canShopperCancel,
  shopperCancelBlockReason,
  shopperLookupNotFound,
  toShopperTrackPayload,
} from "@/lib/db/order-rules";
import { sendOrderStatusUpdateEmail } from "@/lib/email";
import { cancelOrder, getOrderById } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Shopper: cancel own order within 24h while new/processing.
 * Body: { "email": "checkout@email.com" }
 */
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const email =
    typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!email) {
    return NextResponse.json(
      { error: "Provide the email used at checkout." },
      { status: 400 },
    );
  }

  const order = await getOrderById(orderId);
  if (shopperLookupNotFound(order, email)) {
    return NextResponse.json(
      { error: SHOPPER_NOT_FOUND_MESSAGE },
      { status: 404 },
    );
  }

  const now = new Date();
  if (!canShopperCancel(order!, now)) {
    return NextResponse.json(
      { error: shopperCancelBlockReason(order!, now) },
      { status: 409 },
    );
  }

  const cancelRes = await cancelOrder(orderId, SHOPPER_CANCEL_NOTE);
  if (!cancelRes.ok) {
    return NextResponse.json(
      {
        error:
          cancelRes.error || "Could not cancel the order. Please try again.",
      },
      { status: 500 },
    );
  }
  const updated = await getOrderById(orderId);
  if (!updated) {
    return NextResponse.json(
      { error: "Could not cancel the order. Please try again." },
      { status: 500 },
    );
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (order!.customer?.email) {
    try {
      emailSent = await sendOrderStatusUpdateEmail(order!.customer.email, {
        orderId,
        name: order!.customer.name || "there",
        status: "cancelled",
        note: SHOPPER_CANCEL_NOTE,
        total: order!.total,
      });
    } catch (err) {
      emailError = err instanceof Error ? err.message : "send failed";
    }
  }

  return NextResponse.json({
    ok: true,
    order: toShopperTrackPayload(updated),
    email: emailSent
      ? "sent"
      : emailError
        ? `failed: ${emailError}`
        : "not sent (no email on order)",
  });
}
