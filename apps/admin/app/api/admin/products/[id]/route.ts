import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminProduct,
  discardAdminProductDraft,
  getAdminProduct,
  publishAdminProduct,
  saveAdminProduct,
  unpublishAdminProduct,
} from "@/lib/db/admin-store";
import { setProductCollections } from "@/lib/db/collection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function GETHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const product = await getAdminProduct(params.id);
  if (!product)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ product });
}

async function PATCHHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = body?.doc;
  let result;
  if (action === "publish") result = await publishAdminProduct(params.id, doc);
  else if (action === "unpublish")
    result = await unpublishAdminProduct(params.id);
  else if (action === "discard")
    result = await discardAdminProductDraft(params.id);
  else result = await saveAdminProduct(params.id, doc);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  if (action === "save" || action === "publish") {
    await setProductCollections(params.id, body?.collectionIds);
  }
  return NextResponse.json(result);
}

async function DELETEHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteAdminProduct(params.id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/products/:id", GETHandler);
export const PATCH = withAdminApiObservability("PATCH /api/admin/products/:id", PATCHHandler);
export const DELETE = withAdminApiObservability("DELETE /api/admin/products/:id", DELETEHandler);
