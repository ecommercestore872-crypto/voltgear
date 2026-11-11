import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { adminActorId, isAdminRequest } from "@/lib/admin";
import { deleteOrder } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function DELETEHandler(
  request: Request,
  { params }: { params: { orderId: string } },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = params.orderId;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const adminUserId = adminActorId(request);
  if (!adminUserId) {
    return NextResponse.json({ error: "Sign in with your admin email to delete an order." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.confirmation !== orderId) {
    return NextResponse.json({ error: "Type the exact order ID to confirm deletion." }, { status: 400 });
  }

  const result = await deleteOrder(orderId, adminUserId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withAdminApiObservability("DELETE /api/orders/:orderId", DELETEHandler);
