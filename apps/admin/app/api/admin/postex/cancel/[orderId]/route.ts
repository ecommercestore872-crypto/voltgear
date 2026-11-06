import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { runPostExCancelOrderForOrderId } from "@/lib/postex-cancel-order";
import { claimPostExCancellation, markPostExCancellationUnknown, markPostExCancellationConfirmed } from "@/lib/postex-cancel-state-db";

export const dynamic = "force-dynamic";

async function PUTHandler(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await runPostExCancelOrderForOrderId((await context.params).orderId, {
    getOrder: getOrderByPublicId,
    claimCancellation: claimPostExCancellation,
    markUnknown: markPostExCancellationUnknown,
    markConfirmed: markPostExCancellationConfirmed,
  });

  return NextResponse.json(result.body, { status: result.status });
}

export const PUT = withAdminApiObservability(
  "PUT /api/admin/postex/cancel/[orderId]",
  PUTHandler,
);
