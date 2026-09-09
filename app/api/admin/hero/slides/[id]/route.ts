import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  deleteAdminHeroSlide,
  publishAdminHeroSlide,
  unpublishAdminHeroSlide,
  updateAdminHeroSlide,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function docFromBody(body: { doc?: Record<string, unknown> } | null) {
  const doc = body?.doc ?? {};
  return {
    productId: String(doc.productId ?? ""),
    imageUrl: String(doc.imageUrl ?? ""),
    title: doc.title ? String(doc.title) : undefined,
    subtitle: doc.subtitle ? String(doc.subtitle) : undefined,
    sortOrder: doc.sortOrder != null ? Number(doc.sortOrder) : undefined,
    isDemo: Boolean(doc.isDemo),
  };
}

export async function PATCH(request: Request, ctx: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "save");
  const doc = docFromBody(body);
  let result;
  if (action === "publish") result = await publishAdminHeroSlide(id, doc);
  else if (action === "unpublish") result = await unpublishAdminHeroSlide(id);
  else result = await updateAdminHeroSlide(id, doc);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}

export async function DELETE(request: Request, ctx: Ctx) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const result = await deleteAdminHeroSlide(id);
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}
