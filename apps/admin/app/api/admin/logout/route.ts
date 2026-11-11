import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { adminCookieOptions, isAdminRequest } from "@/lib/admin";
import { ADMIN_ACTOR_COOKIE, ADMIN_COOKIE } from "@/lib/admin-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  res.cookies.set(ADMIN_ACTOR_COOKIE, "", { ...adminCookieOptions(), maxAge: 0 });
  return res;
}

export const POST = withAdminApiObservability("POST /api/admin/logout", POSTHandler);
