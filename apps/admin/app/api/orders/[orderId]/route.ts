import { NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/admin";
import { deleteOrder, getOrderById } from "@/lib/order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
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

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const success = await deleteOrder(orderId);
  if (!success) {
    return NextResponse.json(
      { error: "Could not delete the order. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
