import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { getServiceClient } from "@/lib/supabase/server";
import { createPostExOrder } from "@/lib/postex";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId parameter" }, { status: 400 });
    }

    const order = await getOrderByPublicId(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const customer = order.customer || {};
    const address = [customer.address, customer.city].filter(Boolean).join(", ");
    const itemsDescription = (order.items || [])
      .map((i) => `${i.name || "Item"} x${i.quantity || 1}`)
      .join("; ");

    // Call PostEx API
    const result = await createPostExOrder({
      orderRefNumber: order.orderId,
      invoicePayment: order.total || 0,
      customerName: customer.name || "Customer",
      customerPhone: customer.phone || "03000000000",
      deliveryAddress: address || "Lahore, Pakistan",
      cityName: customer.city || "Lahore",
      orderDetail: itemsDescription || "Electronics Accessories",
      items: order.items?.length || 1,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Save tracking number and update status in Supabase
    const { error: dbError } = await getServiceClient()
      .from("orders")
      .update({
        postex_tracking_number: result.trackingNumber,
        status: "shipped",
        status_updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    if (dbError) {
      console.warn("Order shipped in PostEx but database update failed:", dbError);
    }

    return NextResponse.json({
      success: true,
      trackingNumber: result.trackingNumber,
      message: `Shipment booked successfully with PostEx (Tracking #: ${result.trackingNumber})`,
    });
  } catch (err: unknown) {
    console.error("[PostEx Book Route Error]:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
