import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getOrderByPublicId } from "@/lib/db/store";
import { validateOrderForAutopilot } from "@/lib/autopilot/validator";
import { PostExProvider } from "@/lib/couriers/postex-adapter";
import { getServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId, forceDispatch = false } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await getOrderByPublicId(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 1. Run Autopilot Validation
    const validation = validateOrderForAutopilot(order);

    if (validation.classification === "BLOCKED" && !forceDispatch) {
      return NextResponse.json(
        {
          error: "Order is BLOCKED by Autopilot validation",
          exceptions: validation.exceptions,
        },
        { status: 422 }
      );
    }

    // 2. Check Idempotency Key / Existing Shipment to prevent duplicate bookings
    const fulfillmentKey = `${order.orderId}:POSTEX:1`;
    const supabase = getServiceClient();

    const { data: existingShipment } = await supabase
      .from("shipments")
      .select("*")
      .eq("fulfillment_key", fulfillmentKey)
      .single();

    if (existingShipment && existingShipment.tracking_number) {
      return NextResponse.json({
        alreadyBooked: true,
        trackingNumber: existingShipment.tracking_number,
        message: `Order #${order.orderId} was already booked with PostEx (Tracking: ${existingShipment.tracking_number}). Duplicate booking prevented.`,
      });
    }

    // 3. Dispatch via Courier Adapter
    const provider = new PostExProvider();
    const itemsDescription = (order.items || [])
      .map((i) => `${i.name} x${i.quantity || 1}`)
      .join("; ");

    const result = await provider.createShipment({
      orderId: order.orderId,
      fulfillmentKey,
      customer: {
        name: order.customer?.name || "Customer",
        phone: order.customer?.phone || "",
        normalizedPhone: validation.normalizedPhone,
        address: order.customer?.address || "",
        city: order.customer?.city || "Lahore",
        cityCode: validation.courierCityCode,
      },
      codAmount: validation.commercialSnapshot.codReceivable,
      weightKg: validation.calculatedWeightKg,
      pieces: order.items?.length || 1,
      itemsDescription: itemsDescription || "Electronics Accessories",
    });

    if (!result.ok) {
      // Record exception in db
      await supabase.from("order_exceptions").insert({
        order_id: order.orderId,
        code: "BOOKING_REJECTED",
        reason: result.errorMessage || "Courier booking failed",
      });

      return NextResponse.json({ error: result.errorMessage }, { status: 400 });
    }

    // 4. Record Successful Shipment & Update Order Status
    await supabase.from("shipments").upsert({
      order_id: order.orderId,
      provider: "POSTEX",
      status: "BOOKED",
      tracking_number: result.trackingNumber,
      cod_amount: validation.commercialSnapshot.codReceivable,
      weight_kg: validation.calculatedWeightKg,
      pieces: order.items?.length || 1,
      fulfillment_key: fulfillmentKey,
      destination_city: order.customer?.city || "Lahore",
      customer_snapshot: {
        name: order.customer?.name,
        phone: order.customer?.phone,
        normalizedPhone: validation.normalizedPhone,
        address: order.customer?.address,
        city: order.customer?.city,
      },
      updated_at: new Date().toISOString(),
    });

    await supabase
      .from("orders")
      .update({
        postex_tracking_number: result.trackingNumber,
        status: "shipped",
        status_updated_at: new Date().toISOString(),
      })
      .eq("order_id", order.orderId);

    return NextResponse.json({
      success: true,
      trackingNumber: result.trackingNumber,
      classification: validation.classification,
      message: `Order #${order.orderId} successfully dispatched via PostEx (Tracking #: ${result.trackingNumber}).`,
    });
  } catch (err: unknown) {
    console.error("[Autopilot Dispatch Error]:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
