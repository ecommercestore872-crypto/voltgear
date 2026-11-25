import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { getVapidKeys } from "@/lib/admin-push";

export const dynamic = "force-dynamic";

export const GET = withAdminApiObservability("GET /api/admin/push/key", async (request: Request) => {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { publicKey } = await getVapidKeys();
  return NextResponse.json({ publicKey });
});
