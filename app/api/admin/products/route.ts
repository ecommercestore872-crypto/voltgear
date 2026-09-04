import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { createAdminProduct, listAdminProducts } from "@/lib/db/admin-store";
import { setProductCollections } from "@/lib/db/collection-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await listAdminProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const result = await createAdminProduct(body?.doc ?? body ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.id) {
    await setProductCollections(result.id, body?.collectionIds);
  }
  return NextResponse.json(result);
}
