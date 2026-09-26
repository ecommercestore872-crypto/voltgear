import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import { DEMO_COOKIE } from "@/lib/db/demo-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(request: Request) {
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export const POST = withShopApiObservability("POST /api/demo/logout", POSTHandler);
