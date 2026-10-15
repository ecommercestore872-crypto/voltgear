import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { enqueueEmailEvent } from "@/lib/order-store";
import { isDemoRequest } from "@/lib/demo";
import { takePublicPostLimit } from "@/lib/public-api-guard";
import { validateAbandonedCart } from "@/lib/abandoned-cart-rules";

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

    // Demo sessions must not enqueue real lifecycle email.
    if (isDemoRequest(request)) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const parsed = validateAbandonedCart(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, name, items, subtotal } = parsed.data;

    await enqueueEmailEvent(
      "abandoned-cart",
      email,
      {
        name: name ?? "",
        items: items.map((i) => ({
          name: i.name ?? "",
          price: Number(i.price ?? 0),
          quantity: Number(i.quantity ?? 1),
        })),
        subtotal: Number(subtotal ?? 0),
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
