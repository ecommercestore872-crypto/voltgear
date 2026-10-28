import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { adminCookieOptions, cookieValue, hasValidAdminBearer, isAdminRequest } from "@/lib/admin";
import { revokeAdminBrowserSession } from "@/lib/admin-session-store";
import { isTrustedAdminMutationOrigin } from "@/lib/admin-origin-rules";
import { ADMIN_COOKIE } from "@/lib/db/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  // Keep the exact-origin cookie boundary. Explicitly authenticated machine
  // bearers do not rely on automatically attached browser credentials.
  if ((!isTrustedAdminMutationOrigin(request) && !hasValidAdminBearer(request)) || !(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await revokeAdminBrowserSession(cookieValue(request, ADMIN_COOKIE));
  } catch {
    // Do not claim logout succeeded or clear the only credential before revocation.
    return NextResponse.json({ error: "Sign-out could not be confirmed. Please try again." }, { status: 503 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}

export const POST = withAdminApiObservability("POST /api/admin/logout", POSTHandler);
