import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminShopType,
  getAdminShopType,
  saveAdminShopType,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function GETHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const shopType = await getAdminShopType(params.id);
  if (!shopType)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ shopType });
}

async function PATCHHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await saveAdminShopType(params.id, body?.doc ?? body ?? {});
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

async function DELETEHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteAdminShopType(params.id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/categories/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/categories/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/categories/:id", DELETEHandler);
