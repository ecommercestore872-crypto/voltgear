import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { runPostExConnectivityTest } from "@/lib/postex-connectivity";

export const dynamic = "force-dynamic";

async function GETHandler(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await runPostExConnectivityTest();
  const httpStatus = result.success ? 200 : (result.httpStatus ?? 502);

  return NextResponse.json(
    {
      success: result.success,
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
      operationalCityCount: result.operationalCityCount,
      ...(result.error ? { error: result.error } : {}),
    },
    { status: httpStatus },
  );
}

export const GET = withAdminApiObservability(
  "GET /api/admin/postex/connectivity",
  GETHandler,
);
