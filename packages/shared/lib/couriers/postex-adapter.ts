import {
  courierBookingAllowed,
  resolveCourierBookingMode,
} from "@/lib/courier-booking-mode";
import { createPostExOrder, getPostExInvoice } from "@/lib/postex";
import { fetchPostExTrackOrderFromApi, mapPostExTrackBodyToSafeResponse } from "@/lib/postex-track-order";
import { CreateShipmentParams, ICourierProvider, ShipmentResult } from "./provider";

export class PostExProvider implements ICourierProvider {
  name: "POSTEX" = "POSTEX";

  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    const mode = resolveCourierBookingMode();
    if (!courierBookingAllowed()) {
      if (mode === "mock") {
        return {
          ok: true,
          trackingNumber: `MOCK-PX-${params.orderId}`,
          rawResponse: { mocked: true, mode },
        };
      }
      return {
        ok: false,
        errorMessage: `Courier booking is ${mode}; set COURIER_BOOKING_MODE=live to book PostEx.`,
      };
    }

    const res = await createPostExOrder({
      orderRefNumber: params.orderId,
      invoicePayment: params.codAmount,
      customerName: params.customer.name,
      customerPhone: params.customer.phone,
      deliveryAddress: params.customer.address,
      cityName: params.customer.city,
      orderDetail: params.itemsDescription,
      items: params.pieces || 1,
    });

    if (!res.ok) {
      return {
        ok: false,
        errorMessage: res.error,
      };
    }

    return {
      ok: true,
      trackingNumber: res.trackingNumber,
      rawResponse: res.data,
    };
  }

  async trackShipment(trackingNumber: string) {
    const tracked = await fetchPostExTrackOrderFromApi(trackingNumber);
    if (!tracked.ok) throw new Error("PostEx tracking is currently unavailable.");
    const mapped = mapPostExTrackBodyToSafeResponse("", trackingNumber, tracked.data);
    if ("ok" in mapped || !mapped.transactionStatus) {
      throw new Error("PostEx returned an incomplete tracking response.");
    }
    return {
      status: mapped.transactionStatus,
      history: mapped.transactionStatusHistory.map((entry) => ({
        status: entry.transactionStatusMessage ?? entry.transactionStatusMessageCode ?? "Unknown",
      })),
    };
  }

  async getInvoicePdf(trackingNumbers: string[]) {
    const res = await getPostExInvoice(trackingNumbers);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, pdfBase64: res.pdfBase64 };
  }
}
