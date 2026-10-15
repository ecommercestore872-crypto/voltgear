import { withAdminApiObservability } from "@/lib/admin-api-observability";
import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { deleteOrder, getOrderById } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function DELETEHandler(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const result = await deleteOrder(orderId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true });
}

export const DELETE = withAdminApiObservability("DELETE /api/orders/:orderId", DELETEHandler);
