import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";
import { subscribeNewsletter } from "@/lib/db/newsletter-store";
import { isDemoRequest } from "@/lib/demo";
import { checkoutClientIp } from "@/lib/checkout-guard";

const rateLimiter = createMemoryRateLimiter({
  limit: 8,
  windowMs: 10 * 60 * 1000,
  maxKeys: 2000,
});

async function POSTHandler(req: Request) {
  const ip = checkoutClientIp(req);
  if (!rateLimiter.take({ ip })) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    // A practice interaction should look successful without adding a real
    // marketing subscriber or retaining the supplied address.
    if (isDemoRequest(req)) {
      return NextResponse.json({ ok: true, message: "Practice signup recorded." });
    }
    const result = await subscribeNewsletter({
      email: body?.email,
      source: typeof body?.source === "string" ? body.source : "footer",
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({
      ok: true,
      message: result.created
        ? "You’re on the list."
        : "You’re already on the list.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export const POST = withShopApiObservability("POST /api/newsletter", POSTHandler);
