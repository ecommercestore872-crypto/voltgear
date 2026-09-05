import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { deleteProductDeal, updateProductDeal } from "@/lib/db/deal-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await updateProductDeal(params.id, body ?? {});
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ deal: result.deal });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await deleteProductDeal(params.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
