import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  countAdminProducts,
  createAdminProduct,
  listAdminProductsPage,
  listAdminProductsSearch,
} from "@/lib/db/admin-store";
import { setProductCollections } from "@/lib/db/collection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function GETHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length >= 2) {
    const products = await listAdminProductsSearch(q);
    return NextResponse.json({ products, total: products.length, q });
  }
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? String(ADMIN_PRODUCTS_PAGE_SIZE), 10) ||
      ADMIN_PRODUCTS_PAGE_SIZE),
  );
  const category = url.searchParams.get("category")?.trim() || undefined;
  const stockAttention = url.searchParams.get("stock") === "attention";
  const [products, total] = await Promise.all([
    listAdminProductsPage({ page, pageSize, category, stockAttention }),
    countAdminProducts({ category, stockAttention }),
  ]);
  return NextResponse.json({ products, total, page, pageSize, category });
}

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createAdminProduct(body?.doc ?? body ?? {});
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  if (result.id) {
    await setProductCollections(result.id, body?.collectionIds);
  }
  return NextResponse.json(result);
}

export const GET = withAdminApiObservability("GET /api/admin/products", GETHandler);
export const POST = withAdminApiObservability("POST /api/admin/products", POSTHandler);
