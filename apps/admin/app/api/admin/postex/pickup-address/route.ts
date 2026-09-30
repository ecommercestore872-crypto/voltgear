import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { runPostExPickupAddressLookup } from "@/lib/postex-pickup-address";

export const dynamic = "force-dynamic";

async function GETHandler(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await runPostExPickupAddressLookup();
  const httpStatus = result.success ? 200 : (result.httpStatus ?? 502);

  return NextResponse.json(
    {
      success: result.success,
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      pickupAddresses: result.pickupAddresses,
      ...(result.upstreamHttpStatus != null
        ? { upstreamHttpStatus: result.upstreamHttpStatus }
        : {}),
      ...(result.message ? { message: result.message } : {}),
      ...(result.error ? { error: result.error } : {}),
    },
    { status: httpStatus },
  );
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/pickup-address",
  GETHandler,
);
