import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { updatePromoCode, deletePromoCode } from "@/lib/db/promo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function PATCHHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await updatePromoCode(params.id, body ?? {});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ promo: result.promo });
}

async function DELETEHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deletePromoCode(params.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true });
}

export const PATCH = withAdminApiObservability("PATCH /api/admin/promos/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/promos/:id", DELETEHandler);
