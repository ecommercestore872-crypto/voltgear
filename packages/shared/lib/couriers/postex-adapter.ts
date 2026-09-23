import { createPostExOrder, getPostExInvoice } from "@/lib/postex";
import { CreateShipmentParams, ICourierProvider, ShipmentResult } from "./provider";

export class PostExProvider implements ICourierProvider {
  name: "POSTEX" = "POSTEX";

  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
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
    // PostEx track endpoint implementation
    return {
      status: "BOOKED",
      history: [{ status: "BOOKED", at: new Date().toISOString() }],
    };
  }

  async getInvoicePdf(trackingNumbers: string[]) {
    const res = await getPostExInvoice(trackingNumbers);
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, pdfBase64: res.pdfBase64 };
  }
}
