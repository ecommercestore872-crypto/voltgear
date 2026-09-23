import { AutopilotShipment } from "@/lib/autopilot/types";

export interface CreateShipmentParams {
  orderId: string;
  fulfillmentKey: string;
  customer: {
    name: string;
    phone: string;
    normalizedPhone: string;
    address: string;
    city: string;
    cityCode?: string;
  };
  codAmount: number;
  weightKg: number;
  pieces: number;
  itemsDescription: string;
}

export interface ShipmentResult {
  ok: boolean;
  trackingNumber?: string;
  awbUrl?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface ICourierProvider {
  name: "POSTEX" | "LEOPARDS" | "TCS";
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;
  trackShipment(trackingNumber: string): Promise<{ status: string; history?: any[] }>;
  getInvoicePdf(trackingNumbers: string[]): Promise<{ ok: boolean; pdfBase64?: string; error?: string }>;
}
