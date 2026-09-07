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
    const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
    const address = typeof customer.address === "string" ? customer.address.trim() : "";
    const city = typeof customer.city === "string" ? customer.city.trim() : "";

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Order is missing a valid customer phone. Fix the order before booking PostEx." },
        { status: 400 }
      );
    }
    if (!address || address.length < 5) {
      return NextResponse.json(
        { error: "Order is missing a delivery address. Fix the order before booking PostEx." },
        { status: 400 }
      );
    }
    if (!city) {
      return NextResponse.json(
        { error: "Order is missing a city. Fix the order before booking PostEx." },
        { status: 400 }
      );
    }

    const deliveryAddress = [address, city].filter(Boolean).join(", ");
    const itemsDescription = (order.items || [])
      .map((i) => `${i.name || "Item"} x${i.quantity || 1}`)
      .join("; ");

    const result = await createPostExOrder({
      orderRefNumber: order.orderId,
      invoicePayment: order.total || 0,
      customerName: (customer.name || "").trim() || "Customer",
      customerPhone: phone,
      deliveryAddress,
      cityName: city,
      orderDetail: itemsDescription || "Electronics Accessories",
      items: order.items?.length || 1,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

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
