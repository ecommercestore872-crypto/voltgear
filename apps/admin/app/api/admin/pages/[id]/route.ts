import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminPage,
  discardAdminPageDraft,
  getAdminPage,
  publishAdminPage,
  saveAdminPage,
  unpublishAdminPage,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function GETHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const page = await getAdminPage(params.id);
  if (!page) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ page });
}

async function PATCHHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = body?.doc;
  let result;
  if (action === "publish") result = await publishAdminPage(params.id, doc);
  else if (action === "unpublish") result = await unpublishAdminPage(params.id);
  else if (action === "discard")
    result = await discardAdminPageDraft(params.id);
  else result = await saveAdminPage(params.id, doc);
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
  const result = await deleteAdminPage(params.id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/pages/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/pages/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/pages/:id", DELETEHandler);
