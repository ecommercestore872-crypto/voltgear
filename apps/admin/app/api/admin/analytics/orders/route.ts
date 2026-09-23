import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  loadAnalyticsDrilldown,
  sanitizeDrillOrders,
} from "@/lib/db/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const ids =
    url.searchParams
      .get("ids")
      ?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? [];
  const orders = await loadAnalyticsDrilldown(ids);
  return NextResponse.json({ orders: sanitizeDrillOrders(orders) });
}
