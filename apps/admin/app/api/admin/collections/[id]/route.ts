import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminCollection,
  getAdminCollection,
  updateAdminCollection,
} from "@/lib/db/collection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const collection = await getAdminCollection(params.id).catch(() => null);
  if (!collection)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ collection });
}

async function PATCHHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await updateAdminCollection(params.id, body ?? {});
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ collection: result.collection });
}

async function DELETEHandler(
  request: Request,
  { params }: { params: { id: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteAdminCollection(params.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true });
}

export const GET = withAdminApiObservability("GET /api/admin/collections/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/collections/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/collections/:id", DELETEHandler);
