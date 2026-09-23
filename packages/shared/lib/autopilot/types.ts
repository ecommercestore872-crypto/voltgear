export type FulfillmentClassification = "AUTO_READY" | "VERIFY" | "BLOCKED" | "CANCELLED";

export type ExceptionCode =
  | "ADDRESS_CITY_UNSUPPORTED"
  | "PHONE_INVALID_FORMAT"
  | "OUT_OF_STOCK"
  | "WEIGHT_MISSING"
  | "DUPLICATE_ORDER_SUSPECTED"
  | "COURIER_NOT_CONFIGURED"
  | "HIGH_VALUE_COD_REVIEW"
  | "COURIER_AUTH_ERROR"
  | "COURIER_TIMEOUT"
  | "BOOKING_REJECTED";

export type ShipmentStatus =
  | "READY"
  | "BOOKING"
  | "BOOKED"
  | "PICKUP_PENDING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURN_IN_TRANSIT"
  | "RETURNED"
  | "CANCELLED"
  | "FAILED";

export interface CommercialSnapshot {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paidAmount: number;
  codReceivable: number;
  currency: string;
}

export interface AutopilotShipment {
  id: string;
  orderId: string;
  provider: "POSTEX" | "LEOPARDS" | "TCS" | "TRAX" | "OTHER";
  status: ShipmentStatus;
  trackingNumber?: string;
  awbUrl?: string;
  codAmount: number;
  weightKg: number;
  pieces: number;
  fulfillmentKey: string; // e.g. VG-1001:POSTEX:1
  destinationCity: string;
  courierCityCode?: string;
  customerSnapshot: {
    name: string;
    phone: string;
    normalizedPhone: string;
    address: string;
    city: string;
  };
  payloadSnapshot?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderException {
  id: string;
  orderId: string;
  code: ExceptionCode;
  reason: string;
  suggestedAction?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface CourierCityMapping {
  id: string;
  voltgearCity: string;
  courier: "POSTEX" | "LEOPARDS" | "TCS";
  courierCityCode: string;
  courierCityName: string;
  confidence: "HIGH" | "MEDIUM" | "MANUAL";
  createdAt: string;
}

export interface AutopilotValidationResult {
  classification: FulfillmentClassification;
  commercialSnapshot: CommercialSnapshot;
  normalizedPhone: string;
  isDuplicate: boolean;
  duplicateOfOrderId?: string;
  exceptions: { code: ExceptionCode; reason: string }[];
  suggestedCourier: "POSTEX" | "LEOPARDS";
  courierCityCode?: string;
  calculatedWeightKg: number;
}
