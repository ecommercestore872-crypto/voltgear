import { NextResponse } from "next/server";

import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { isAdminRequest } from "@/lib/admin";
import { normalizeAdminOrdersPage } from "@/lib/db/admin-orders-rules";
import { listAdminOrdersPage } from "@/lib/db/admin-orders-store";
import { toAdminOrderListItem } from "@/lib/db/order-rules";

export const dynamic = "force-dynamic";

export const GET = withAdminApiObservability(
  "GET /api/admin/orders",
  async (request: Request) => {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const page = normalizeAdminOrdersPage(url.searchParams.get("page"));
    const tab = url.searchParams.get("tab") ?? url.searchParams.get("status") ?? "all";
    const q = url.searchParams.get("q")?.trim() ?? "";

    const result = await listAdminOrdersPage({
      page,
      tab,
      q: q.length >= 2 ? q : undefined,
    });

    return NextResponse.json({
      orders: result.orders.map(toAdminOrderListItem),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      tabCounts: result.tabCounts,
    });
  },
);
