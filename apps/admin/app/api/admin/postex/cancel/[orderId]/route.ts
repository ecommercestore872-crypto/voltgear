import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { runPostExCancelOrderForOrderId } from "@/lib/postex-cancel-order";

export const dynamic = "force-dynamic";

async function PUTHandler(
  req: NextRequest,
  context: { params: { orderId: string } },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await runPostExCancelOrderForOrderId(context.params.orderId, {
    getOrder: getOrderByPublicId,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export const PUT = withAdminApiObservability(
  "PUT /api/admin/postex/cancel/[orderId]",
  PUTHandler,
);
