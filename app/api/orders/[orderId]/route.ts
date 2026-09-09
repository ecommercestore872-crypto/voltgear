import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderById, deleteOrder } from "@/lib/order-store";
import {
  SHOPPER_NOT_FOUND_MESSAGE,
  shopperLookupNotFound,
  toShopperTrackPayload,
} from "@/lib/db/order-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer order lookup. Requires the email used at checkout so only the
 * customer can see the order:
 *
 *   curl "http://localhost:3000/api/orders/VG-XXXXXXXX?email=customer@example.com"
 *
 * Returns a summary (status, timeline, items, totals) — no phone/address.
 */
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const email = new URL(request.url).searchParams
    .get("email")
    ?.toLowerCase()
    .trim();
  if (!email) {
    return NextResponse.json(
      { error: "Provide the email used at checkout: ?email=you@example.com" },
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

  return NextResponse.json(toShopperTrackPayload(order!));
}

/**
 * Admin: delete an order permanently.
 *
 *   curl -X DELETE http://localhost:3001/api/orders/VG-XXXXXXXX \
 *     -H "Authorization: Bearer <ADMIN_TOKEN>"
 */
export async function DELETE(
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

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const success = await deleteOrder(orderId);
  if (!success) {
    return NextResponse.json(
      { error: "Could not delete the order. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
