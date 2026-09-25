import { NextResponse } from "next/server";

import { getOrderById } from "@/lib/order-store";
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
