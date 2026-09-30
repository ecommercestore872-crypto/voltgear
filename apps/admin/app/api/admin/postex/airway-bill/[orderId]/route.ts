import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { runPostExAirwayBillForOrderId } from "@/lib/postex-airway-bill";

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

  const result = await runPostExAirwayBillForOrderId(context.params.orderId, {
    getOrder: getOrderByPublicId,
  });

  if (result.kind === "json") {
    return NextResponse.json(result.body, { status: result.status });
  }

  return new NextResponse(result.pdfBytes, {
    status: result.status,
    headers: result.headers,
  });
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/airway-bill/[orderId]",
  GETHandler,
);
