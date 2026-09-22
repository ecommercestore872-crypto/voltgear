import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { scoreAdminSearchHits } from "@/lib/db/admin-search-rules";
import { listAdminProductPickers } from "@/lib/db/admin-store";
import { listAdminCustomers } from "@/lib/db/customer-list";
import { getLightweightOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ hits: [] });
  }
  try {
    const [orders, products, customers] = await Promise.all([
      getLightweightOrders(),
      listAdminProductPickers(),
      listAdminCustomers(),
    ]);
    const hits = scoreAdminSearchHits(q, {
      orders: orders
        .filter((o) => !o.isDemo)
        .map((o) => ({ orderId: o.orderId })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      })),
      customers,
    });
    return NextResponse.json({ hits });
  } catch (error) {
    console.error("[admin-search]", error);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
