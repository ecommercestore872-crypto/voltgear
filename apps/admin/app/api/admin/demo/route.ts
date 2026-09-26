import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { purgeDemoData } from "@/lib/db/admin-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function DELETEHandler(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeDemoData();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Purge failed" },
      { status: 500 },
    );
  }
}

export const DELETE = withAdminApiObservability("DELETE /api/admin/demo", DELETEHandler);
