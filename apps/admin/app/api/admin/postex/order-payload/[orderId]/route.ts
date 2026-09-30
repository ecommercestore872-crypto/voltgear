import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { fetchPostExOperationalCityNames } from "@/lib/postex-connectivity";
import { buildPostExOrderPayloadFromOrder } from "@/lib/postex-order-payload";

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

  const orderId = context.params.orderId?.trim();
  if (!orderId) {
    return NextResponse.json(
      { success: false, error: "Missing orderId." },
      { status: 400 },
    );
  }

  const order = await getOrderByPublicId(orderId);
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found." },
      { status: 404 },
    );
  }

  const operationalCities = await fetchPostExOperationalCityNames();
  if (!operationalCities.ok) {
    return NextResponse.json(
      {
        success: false,
        dryRun: true,
        error: operationalCities.error,
      },
      { status: operationalCities.httpStatus ?? 502 },
    );
  }

  const built = buildPostExOrderPayloadFromOrder(order, operationalCities.cities);
  if (!built.ok) {
    return NextResponse.json(
      {
        success: false,
        dryRun: true,
        missingOrInvalid: built.missingOrInvalid,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    dryRun: true,
    orderId: order.orderId,
    payload: built.payload,
  });
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/order-payload/[orderId]",
  GETHandler,
);
