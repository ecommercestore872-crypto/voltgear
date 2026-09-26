import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { createPromoCode, listPromoCodes } from "@/lib/db/promo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const promos = await listPromoCodes();
    return NextResponse.json({ promos });
  } catch (error) {
    console.error("[promo] list", error);
    return NextResponse.json(
      { error: "Promo table not ready. Push the promo_codes migration." },
      { status: 503 },
    );
  }
}

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await createPromoCode(body ?? {});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ promo: result.promo });
}

export const GET = withAdminApiObservability("GET /api/admin/promos", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/promos", POSTHandler);
