import { NextResponse } from "next/server";

import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { isAdminRequest } from "@/lib/admin";
import { scoreAdminSearchHits } from "@/lib/db/admin-search-rules";
import { searchAdminOrdersByTerm } from "@/lib/db/admin-orders-store";
import { listAdminProductsSearch } from "@/lib/db/admin-store";
import { buildCustomerRowsFromOrders } from "@/lib/db/customer-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAdminApiObservability(
  "GET /api/admin/search",
  async (request: Request) => {
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
        searchAdminOrdersByTerm(trimmed, 24),
        listAdminProductsSearch(trimmed),
      ]);
      const customers = buildCustomerRowsFromOrders(orders).slice(0, 12);
      const hits = scoreAdminSearchHits(trimmed, {
        orders: orders.map((o) => ({ orderId: o.orderId })),
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
  },
);
