import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { ProductInputError, productMutationRequest } from "@/lib/admin-product-input";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  createAdminProduct,
  listAdminProductsPageWithCount,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? String(ADMIN_PRODUCTS_PAGE_SIZE), 10) ||
      ADMIN_PRODUCTS_PAGE_SIZE),
  );
  const category = url.searchParams.get("category")?.trim() || undefined;
  const stockAttention = url.searchParams.get("stock") === "attention";
  try {
    const result = await listAdminProductsPageWithCount({ page, pageSize, q, category, stockAttention });
    return NextResponse.json({ ...result, q, category, stock: stockAttention ? "attention" : undefined });
  } catch {
    return NextResponse.json({ error: "Products are temporarily unavailable." }, { status: 503 });
  }
}

async function POSTHandler(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  let input;
  try { input = productMutationRequest(body, true); }
  catch (error) { return NextResponse.json({ error: error instanceof ProductInputError ? error.message : "Invalid product request." }, { status: 400 }); }
  const result = await createAdminProduct(input.document, input.collectionIds);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/products", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/products", POSTHandler);
