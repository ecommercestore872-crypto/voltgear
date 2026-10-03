import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { getOrderById } from "@/lib/order-store";
import {
  SHOPPER_NOT_FOUND_MESSAGE,
  shopperLookupNotFound,
  toShopperTrackPayload,
} from "@/lib/db/order-rules";
import { refreshOrderStatusFromPostExIfDue } from "@/lib/postex-shopper-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer order lookup. Requires order number + mobile (or email):
 *
 *   /api/orders/BNT-1042?phone=03001234567
 *
 * When booked on PostEx, status is refreshed from the courier (throttled).
 * Returns status, timeline, items, totals — no full address.
 */
async function GETHandler(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const paramsUrl = new URL(request.url);
  const email = paramsUrl.searchParams.get("email")?.toLowerCase().trim() ?? "";
  const phone = paramsUrl.searchParams.get("phone")?.trim() ?? "";
  if (!email && !phone) {
    return NextResponse.json(
      {
        error:
          "Enter your mobile number from checkout (or email if you added one).",
      },
      { status: 400 },
    );
  }

  let order = await getOrderById(orderId);
  if (shopperLookupNotFound(order, { email, phone })) {
    return NextResponse.json(
      { error: SHOPPER_NOT_FOUND_MESSAGE },
      { status: 404 },
    );
  }

  if (order?.postexTrackingNumber?.trim()) {
    await refreshOrderStatusFromPostExIfDue(orderId).catch(() => undefined);
    order = (await getOrderById(orderId)) ?? order;
  }

  return NextResponse.json(toShopperTrackPayload(order!));
}

export const GET = withShopApiObservability("GET /api/orders/:orderId", GETHandler);
