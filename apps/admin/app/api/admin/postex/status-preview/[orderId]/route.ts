import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { runPostExStatusPreviewForOrderId } from "@/lib/postex-status-preview";

export const dynamic = "force-dynamic";

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

  const result = await runPostExStatusPreviewForOrderId(context.params.orderId, {
    getOrder: getOrderByPublicId,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/status-preview/[orderId]",
  GETHandler,
);
