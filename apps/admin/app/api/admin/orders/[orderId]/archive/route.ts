import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { setAdminOrderArchived } from "@/lib/db/admin-orders-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = (await params).orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.archived !== "boolean") {
    return NextResponse.json({ error: "Archived state must be true or false." }, { status: 400 });
  }

  const result = await setAdminOrderArchived(orderId, body.archived);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export const POST = withAdminApiObservability("POST /api/admin/orders/:orderId/archive", POSTHandler);
