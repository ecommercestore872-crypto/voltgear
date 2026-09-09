import { NextResponse } from "next/server";

import { adminCookieOptions, getAdminSecret } from "@/lib/admin";
import { createMemoryRateLimiter } from "@/lib/db/analytics-ingest-rules";
import { ADMIN_COOKIE } from "@/lib/db/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginLimiter = createMemoryRateLimiter({
  limit: 8,
  windowMs: 15 * 60_000,
  maxKeys: 5_000,
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!loginLimiter.take({ ip })) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password ? String(body.password) : "";
  const secret = getAdminSecret();

  if (!password || password !== secret) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  // Cookie-only session — do not return the raw secret to the browser.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, adminCookieOptions());
  return res;
}
