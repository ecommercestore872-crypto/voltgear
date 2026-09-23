import { NormalizedDeliveryStatus, RescueReason } from "./rescue-types";

/**
 * Normalizes raw courier status strings into VoltGear standardized states.
 */
export function normalizeCourierStatus(
  rawStatus: string,
  provider: "POSTEX" | "LEOPARDS" | "TCS"
): NormalizedDeliveryStatus {
  if (!rawStatus) return "UNKNOWN";
  const s = rawStatus.toLowerCase().trim();

  // PostEx & Leopards Common Mappings
  if (s.includes("delivered") || s.includes("successful delivery")) return "DELIVERED";
  if (s.includes("out for delivery") || s.includes("dispatched for delivery")) return "OUT_FOR_DELIVERY";
  if (s.includes("in transit") || s.includes("arrived at hub") || s.includes("under transit")) return "IN_TRANSIT";
  if (s.includes("destination hub") || s.includes("reached destination")) return "AT_DESTINATION_HUB";
  if (s.includes("picked up") || s.includes("shipment picked")) return "PICKED_UP";
  if (s.includes("booking") || s.includes("order created")) return "BOOKED";

  // Failure & Return Mappings
  if (s.includes("returned to shipper") || s.includes("returned") || s.includes("rto")) return "RETURNED";
  if (s.includes("return in transit") || s.includes("returning")) return "RETURN_IN_TRANSIT";
  if (s.includes("return initiated") || s.includes("rto initiated")) return "RETURN_INITIATED";
  if (s.includes("unreachable") || s.includes("no response")) return "DELIVERY_ATTEMPT_FAILED";
  if (s.includes("refused") || s.includes("rejected")) return "CUSTOMER_REFUSED";
  if (s.includes("wrong address") || s.includes("incomplete address")) return "ADDRESS_ISSUE";
  if (s.includes("consignee unavailable") || s.includes("customer unavailable")) return "CUSTOMER_UNAVAILABLE";

  return "UNKNOWN";
}

/**
 * Classifies raw delivery failure messages into structured Rescue Reasons.
 */
export function classifyRescueReason(rawMessage: string): RescueReason {
  const m = (rawMessage || "").toLowerCase();

  if (m.includes("refuse") || m.includes("reject") || m.includes("cancelled by customer")) {
    return "CUSTOMER_REFUSED";
  }
  if (m.includes("address") || m.includes("location") || m.includes("untraceable")) {
    return "ADDRESS_INCOMPLETE";
  }
  if (m.includes("phone") || m.includes("unreachable") || m.includes("no answer") || m.includes("switched off")) {
    return "PHONE_UNREACHABLE";
  }
  if (m.includes("money") || m.includes("cash") || m.includes("cod")) {
    return "COD_UNAVAILABLE";
  }
  if (m.includes("denies") || m.includes("not ordered")) {
    return "CUSTOMER_DENIES_ORDER";
  }

  return "CUSTOMER_UNAVAILABLE";
}

/**
 * Generates a secure, 32-character customer rescue token.
 */
export function generateRescueToken(orderId: string): string {
  const random = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `vg_rescue_${orderId.toLowerCase()}_${time}_${random}`;
}
