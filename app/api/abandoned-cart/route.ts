import { NextResponse } from "next/server";

import { enqueueEmailEvent } from "@/lib/order-store";
import { takePublicPostLimit } from "@/lib/public-api-guard";
import type { OrderItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called from the checkout page when a visitor who entered their email leaves
 * before completing the order. Queues an abandoned-cart email (3h delay).
 */
export async function POST(request: Request) {
  try {
    const limited = takePublicPostLimit(request, "abandoned");
    if (!limited.ok) {
      return NextResponse.json({ error: limited.error }, { status: limited.status });
    }

    const body = await request.json();
    const { email, name, items, subtotal } = body as {
      email?: string;
      name?: string;
      items?: OrderItem[];
      subtotal?: number;
    };

    if (!email || !items?.length) {
      return NextResponse.json({ error: "Nothing to track." }, { status: 400 });
    }

    await enqueueEmailEvent(
      "abandoned-cart",
      email.toLowerCase().trim(),
      {
        name: name ?? "",
        items: items.map((i) => ({
          name: i.name ?? "",
          price: Number(i.price ?? 0),
          quantity: Number(i.quantity ?? 1),
        })),
        subtotal: Number(subtotal ?? 0),
      },
      3 * 60 * 60 * 1000
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Abandoned-cart error:", error);
    return NextResponse.json({ ok: true });
  }
}
