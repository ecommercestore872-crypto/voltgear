import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { saveAdminLifestyleShop } from "@/lib/db/admin-store";
import { normalizeLifestyleShop } from "@/lib/db/lifestyle-shop-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const shop = normalizeLifestyleShop(body?.shop ?? body);
  const result = await saveAdminLifestyleShop(shop);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, shop: result.shop });
}
