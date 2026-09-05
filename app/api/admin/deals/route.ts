import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { suggestDealPairs } from "@/lib/db/deal-rules";
import {
  createProductDeal,
  fetchDealCatalog,
  listProductDeals,
  loadDealFloorExtras,
} from "@/lib/db/deal-store";
import { getAllOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [deals, catalog, extras, orders] = await Promise.all([
      listProductDeals(),
      fetchDealCatalog(),
      loadDealFloorExtras(),
      getAllOrders(),
    ]);
    const suggestions = suggestDealPairs(orders, catalog, extras, deals);
    return NextResponse.json({
      deals,
      suggestions,
      catalog: catalog.map((p) => ({ slug: p.slug, name: p.name, price: p.price })),
    });
  } catch (error) {
    console.error("[deals] list", error);
    return NextResponse.json({ error: "Could not load deals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await createProductDeal(body ?? {});
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ deal: result.deal });
}
