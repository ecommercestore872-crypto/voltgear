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
  const email = body?.email ? String(body.email).trim() : "";
  const password = body?.password ? String(body.password) : "";
  const secret = getAdminSecret();

  // Try legacy password-only fallback first (if no email is provided)
  let isValid = false;
  
  if (!email && password === secret) {
    isValid = true;
  } else if (email && password) {
    // Authenticate against database Identity via Supabase Auth
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.session) {
      isValid = true;
    }
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Cookie-only session — do not return the raw secret to the browser.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, secret, adminCookieOptions());
  return res;
}
