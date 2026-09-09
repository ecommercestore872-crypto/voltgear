import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  createAdminHeroSlide,
  getHomePublishBlockers,
  listAdminHeroSlides,
  reorderAdminHeroSlides,
} from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [slides, blockers] = await Promise.all([
      listAdminHeroSlides(),
      getHomePublishBlockers(),
    ]);
    return NextResponse.json({ slides, blockers });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load slides";
    return NextResponse.json(
      { error: message, slides: [], blockers: [message] },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (body?.action === "reorder" && Array.isArray(body.orderedIds)) {
    const result = await reorderAdminHeroSlides(body.orderedIds.map(String));
    if (!result.ok)
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    return NextResponse.json(result);
  }
  const doc = body?.doc ?? {};
  const result = await createAdminHeroSlide({
    productId: String(doc.productId ?? ""),
    imageUrl: String(doc.imageUrl ?? ""),
    title: doc.title ? String(doc.title) : undefined,
    subtitle: doc.subtitle ? String(doc.subtitle) : undefined,
    sortOrder: doc.sortOrder != null ? Number(doc.sortOrder) : undefined,
    isDemo: Boolean(doc.isDemo),
  });
  if (!result.ok)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  return NextResponse.json(result);
}
