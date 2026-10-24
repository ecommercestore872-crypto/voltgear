import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminProduct,
  discardAdminProductDraft,
  getAdminProductForEditor,
  publishAdminProduct,
  saveAdminProduct,
  unpublishAdminProduct,
} from "@/lib/db/admin-store";
import { ProductInputError, productMutationRequest } from "@/lib/admin-product-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function GETHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const product = await getAdminProductForEditor((await params).id);
  if (!product)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ product });
}

async function PATCHHandler(request: Request, { params }: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  let input;
  try { input = productMutationRequest(body); }
  catch (error) { return NextResponse.json({ error: error instanceof ProductInputError ? error.message : "Invalid product request." }, { status: 400 }); }
  const { action, document: doc, collectionIds, expectedAdminRevision } = input;
  let result;
  if (action === "publish") {
    result = await publishAdminProduct((await params).id, doc, collectionIds, expectedAdminRevision);
  }
  else if (action === "unpublish")
    result = await unpublishAdminProduct((await params).id, expectedAdminRevision);
  else if (action === "discard")
    result = await discardAdminProductDraft((await params).id, expectedAdminRevision);
  else result = await saveAdminProduct((await params).id, doc, collectionIds, expectedAdminRevision);
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
  const result = await deleteAdminProduct((await params).id);
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
