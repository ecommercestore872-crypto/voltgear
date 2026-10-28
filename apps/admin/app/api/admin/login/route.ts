import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { adminCookieOptions } from "@/lib/admin";
import { isAllowedAdminAuthEmail, normalizeAdminEmail } from "@/lib/admin-auth-email";
import { createAdminBrowserSession } from "@/lib/admin-session-store";
import { isTrustedAdminMutationOrigin } from "@/lib/admin-origin-rules";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";
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

async function POSTHandler(request: Request) {
  if (!isTrustedAdminMutationOrigin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ip = clientIp(request);
  if (!loginLimiter.take({ ip })) {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = body?.email ? normalizeAdminEmail(String(body.email)) : "";
  const password = body?.password ? String(body.password) : "";
  if (!email || !password || !isAllowedAdminAuthEmail(email)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    const authenticatedEmail = normalizeAdminEmail(data.user?.email ?? "");
    if (error || !data.session || !data.user || authenticatedEmail !== email || !isAllowedAdminAuthEmail(authenticatedEmail)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    // This JWT comes directly from the successful password verification above,
    // never from browser input. The RPC also verifies its live Auth session/user.
    const claims = JSON.parse(Buffer.from(data.session.access_token.split(".")[1], "base64url").toString("utf8"));
    if (typeof claims.session_id !== "string" || !data.user.updated_at) throw new Error("Missing Auth session identity.");
    const token = await createAdminBrowserSession(data.user.id, claims.session_id, data.user.updated_at);
    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "no-store");
    res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export const POST = withAdminApiObservability("POST /api/admin/login", POSTHandler);
