import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { enqueueEmailEvent } from "@/lib/order-store";
import { normalizeAbandonedCart } from "@/lib/abandoned-cart-rules";
import {
  takeAbandonedEmailLimit,
  takePublicPostLimit,
} from "@/lib/public-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called from the checkout page when a visitor who entered their email leaves
 * before completing the order. Queues an abandoned-cart email (3h delay).
 */
async function POSTHandler(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "abandoned");
    if (!limited.ok) {
      return NextResponse.json(
        { error: limited.error },
        { status: limited.status },
      );
    }

    const parsed = normalizeAbandonedCart(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const emailLimit = takeAbandonedEmailLimit(parsed.value.email);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: emailLimit.error },
        { status: emailLimit.status },
      );
    }

    await enqueueEmailEvent(
      "abandoned-cart",
      parsed.value.email,
      {
        name: parsed.value.name,
        items: parsed.value.items,
        subtotal: parsed.value.subtotal,
      },
      3 * 60 * 60 * 1000,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Abandoned-cart error:", error);
    return NextResponse.json({ ok: true });
  }
}

export const POST = withShopApiObservability("POST /api/abandoned-cart", POSTHandler);
