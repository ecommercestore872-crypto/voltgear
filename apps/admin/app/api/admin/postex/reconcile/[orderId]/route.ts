import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import {
  defaultReconcileListDates,
  fetchPostExListOrders,
  findPostExOrderByRefNumber,
  mapReconcileDbState,
  toSafePostExOrderSummary,
} from "@/lib/postex-reconcile";
import { getServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseDateParam(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

async function GETHandler(
  req: NextRequest,
  context: { params: { orderId: string } },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const orderId = context.params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json(
      { success: false, error: "Missing orderId." },
      { status: 400 },
    );
  }

  const { data: row, error } = await getServiceClient()
    .from("orders")
    .select(
      "order_id, status, postex_tracking_number, postex_booking_claimed_at, status_updated_at, created_at",
    )
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) {
    console.error("[postex-reconcile] load order failed:", error.message);
    return NextResponse.json(
      { success: false, error: "Could not load order." },
      { status: 500 },
    );
  }

  if (!row) {
    return NextResponse.json(
      { success: false, error: "Order not found." },
      { status: 404 },
    );
  }

  const dbState = mapReconcileDbState(row);
  const fromQuery = parseDateParam(req.nextUrl.searchParams.get("fromDate"));
  const toQuery = parseDateParam(req.nextUrl.searchParams.get("toDate"));
  const defaults = defaultReconcileListDates(row);
  const fromDate = fromQuery ?? defaults.fromDate;
  const toDate = toQuery ?? defaults.toDate;

  const listed = await fetchPostExListOrders({
    orderStatusID: 0,
    fromDate,
    toDate,
  });

  if (!listed.ok) {
    return NextResponse.json(
      {
        success: false,
        upstreamHttpStatus: listed.httpStatus,
        ...(listed.statusCode != null ? { statusCode: listed.statusCode } : {}),
        ...(listed.statusMessage != null
          ? { statusMessage: listed.statusMessage }
          : {}),
        error: listed.error,
      },
      { status: listed.httpStatus ?? 502 },
    );
  }

  const match = findPostExOrderByRefNumber(listed.body, orderId);
  if (!match) {
    return NextResponse.json({
      success: true,
      foundInPostEx: false,
      dbState,
    });
  }

  return NextResponse.json({
    success: true,
    foundInPostEx: true,
    dbState,
    postexOrder: toSafePostExOrderSummary(match),
  });
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/reconcile/[orderId]",
  GETHandler,
);
