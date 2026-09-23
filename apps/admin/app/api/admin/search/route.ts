import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { scoreAdminSearchHits } from "@/lib/db/admin-search-rules";
import { listAdminProductsSearch } from "@/lib/db/admin-store";
import { buildCustomerRowsFromOrders } from "@/lib/db/customer-list";
import { getLightweightOrders } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const trimmed = q.trim();
  if (trimmed.length < 2) {
    return NextResponse.json({ hits: [] });
  }
  try {
    const [orders, products] = await Promise.all([
      getLightweightOrders(),
      listAdminProductsSearch(trimmed),
    ]);
    const customers = buildCustomerRowsFromOrders(
      orders.filter((o) => !o.isDemo),
    );
    const hits = scoreAdminSearchHits(trimmed, {
      orders: orders
        .filter((o) => !o.isDemo)
        .map((o) => ({ orderId: o.orderId })),
      products: products.map((p) => ({
        id: p._id,
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
