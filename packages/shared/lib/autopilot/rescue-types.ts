export type NormalizedDeliveryStatus =
  | "BOOKED"
  | "PICKUP_PENDING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "AT_DESTINATION_HUB"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_ATTEMPT_FAILED"
  | "CUSTOMER_UNAVAILABLE"
  | "ADDRESS_ISSUE"
  | "CUSTOMER_REFUSED"
  | "DELIVERED"
  | "RETURN_INITIATED"
  | "RETURN_IN_TRANSIT"
  | "RETURNED"
  | "STUCK_IN_TRANSIT"
  | "PICKUP_DELAY"
  | "LOST"
  | "DAMAGED"
  | "UNKNOWN";

export type RescueReason =
  | "CUSTOMER_UNAVAILABLE"
  | "PHONE_UNREACHABLE"
  | "ADDRESS_INCOMPLETE"
  | "WRONG_ADDRESS"
  | "CUSTOMER_REFUSED"
  | "CUSTOMER_DENIES_ORDER"
  | "COD_UNAVAILABLE"
  | "COURIER_STALLED"
  | "DELIVERY_CONFLICT";

export interface RescueAction {
  id: string;
  shipmentId: string;
  orderId: string;
  reason: RescueReason;
  customerToken: string;
  customerResponse?: {
    action: "RETRY" | "UPDATE_ADDRESS" | "UPDATE_PHONE" | "CONTACT_SUPPORT";
    newAddress?: string;
    newPhone?: string;
    note?: string;
    updatedAt: string;
  };
  attemptCount: number;
  maxAttempts: number;
  status: "PENDING_CUSTOMER" | "RESOLVED" | "ESCALATED_MERCHANT" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTrackingEvent {
  status: NormalizedDeliveryStatus;
  rawStatus: string;
  location?: string;
  message?: string;
  timestamp: string;
}
