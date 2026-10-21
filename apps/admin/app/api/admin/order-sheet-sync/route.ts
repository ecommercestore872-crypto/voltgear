import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { syncOrderToGoogleSheet } from "@/lib/order-sheet-sync";
import { getServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

async function POSTHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId && body?.from && body?.to) {
    const from = new Date(body.from);
    const to = new Date(body.to);
    const offset = body.offset ?? 0;
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) ||
        to < from || to.getTime() - from.getTime() > 31 * 86400000 ||
        !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
      return NextResponse.json({ error: "Use a valid date range of up to 31 days and a non-negative offset." }, { status: 400 });
    }
    // Read-only recovery: ten orders per request, with stable pagination.
    const { data, error } = await getServiceClient().from("orders")
      .select("order_id").eq("is_demo", false)
      .gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
      .order("created_at", { ascending: true }).order("order_id", { ascending: true })
      .range(offset, offset + 10);
    if (error) return NextResponse.json({ error: "Could not read orders." }, { status: 503 });
    const batch = (data ?? []).slice(0, 10);
    const results = [];
    for (let index = 0; index < batch.length; index += 2) {
      results.push(...await Promise.all(batch.slice(index, index + 2).map(async (row) => ({
        orderId: row.order_id,
        ...await syncOrderToGoogleSheet(String(row.order_id)),
      }))));
    }
    return NextResponse.json({ results, nextOffset: (data?.length ?? 0) > 10 ? offset + 10 : null });
  }
  if (!orderId || orderId.length > 100) {
    return NextResponse.json({ error: "A valid order ID is required." }, { status: 400 });
  }

  const result = await syncOrderToGoogleSheet(orderId);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export const POST = withAdminApiObservability(
  "POST /api/admin/order-sheet-sync",
  POSTHandler,
);
