import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  adminPasswordResetRedirectUrl,
  isAllowedAdminAuthEmail,
  normalizeAdminEmail,
} from "@/lib/admin-auth-email";
import { ensureAuthUserForEmail } from "@/lib/admin-auth-supabase";
import { createMemoryRateLimiter } from "@/lib/memory-rate-limit";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const forgotLimiter = createMemoryRateLimiter({
  limit: 5,
  windowMs: 15 * 60_000,
  maxKeys: 5_000,
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** Always respond ok when processed or silently ignored (no email enumeration). */
async function POSTHandler(request: Request) {
  const ip = clientIp(request);
  if (!forgotLimiter.take({ ip })) {
    return NextResponse.json(
      { error: "Too many reset requests. Wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const email = body?.email ? normalizeAdminEmail(String(body.email)) : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!isAllowedAdminAuthEmail(email)) {
    return NextResponse.json({ ok: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return NextResponse.json(
      { error: "Password reset is not configured on this server." },
      { status: 503 },
    );
  }

  try {
    const admin = getServiceClient({ admin: true });
    await ensureAuthUserForEmail(admin, email);

    const redirectTo = adminPasswordResetRedirectUrl();
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      console.error("[admin forgot-password]", error.message);
      return NextResponse.json(
        { error: "Could not send reset email. Try again or contact support." },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[admin forgot-password]", err);
    return NextResponse.json(
      { error: "Could not send reset email. Try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export const POST = withAdminApiObservability("POST /api/admin/forgot-password", POSTHandler);
