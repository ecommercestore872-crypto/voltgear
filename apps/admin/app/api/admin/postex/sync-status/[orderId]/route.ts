import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId, updateOrderStatusRow } from "@/lib/db/store";
import { runPostExStatusSyncForOrderId } from "@/lib/postex-status-sync";

export const dynamic = "force-dynamic";

async function POSTHandler(
  req: NextRequest,
  context: { params: { orderId: string } },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await runPostExStatusSyncForOrderId(context.params.orderId, {
    getOrder: getOrderByPublicId,
    applyStatusUpdate: async (orderId, newStatus, note) => {
      const updated = await updateOrderStatusRow(orderId, newStatus, note);
      if (!updated) {
        return { ok: false, error: "Could not update order status." };
      }
      return { ok: true };
    },
  });

  return NextResponse.json(result.body, { status: result.status });
}

export const POST = withAdminApiObservability(
  "POST /api/admin/postex/sync-status/[orderId]",
  POSTHandler,
);
