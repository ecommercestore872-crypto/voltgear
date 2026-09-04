import { NextRequest, NextResponse } from "next/server";

import { createMemoryRateLimiter } from "@/lib/db/analytics-ingest-rules";
import { subscribeNewsletter } from "@/lib/db/newsletter-store";

const rateLimiter = createMemoryRateLimiter({
  limit: 8,
  windowMs: 10 * 60 * 1000,
  maxKeys: 2000,
});

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (ip && !rateLimiter.take({ ip })) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const result = await subscribeNewsletter({
      email: body?.email,
      source: typeof body?.source === "string" ? body.source : "footer",
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
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
