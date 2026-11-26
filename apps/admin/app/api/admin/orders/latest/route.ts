import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { getLatestAdminOrder } from "@/lib/db/admin-orders-store";

export const dynamic = "force-dynamic";

export const GET = withAdminApiObservability("GET /api/admin/orders/latest", async (request: Request) => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ latest: await getLatestAdminOrder() });
});
