import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/deploy-rules";
import { getOrderByPublicId, updateOrderStatusRow } from "@/lib/db/store";
import { runPostExStatusSyncForOrderId } from "@/lib/postex-status-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-to-server PostEx status sync (shop track page → admin PostEx token).
 * Authorization: Bearer CRON_SECRET (same secret as shop + admin crons).
 */
export async function POST(
  request: Request,
  context: { params: { orderId: string } },
) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.POSTEX_API_TOKEN?.trim()) {
    return NextResponse.json(
      { ok: false, error: "POSTEX_API_TOKEN not configured on admin." },
      { status: 503 },
    );
  }

  const orderId = context.params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId." }, { status: 400 });
  }

  const result = await runPostExStatusSyncForOrderId(orderId, {
    getOrder: getOrderByPublicId,
    applyStatusUpdate: async (id, newStatus, note) => {
      const updated = await updateOrderStatusRow(id, newStatus, note);
      if (!updated) {
        return { ok: false, error: "Could not update order status." };
      }
      return { ok: true };
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}
