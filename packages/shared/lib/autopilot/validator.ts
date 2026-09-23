/**
 * VoltGear Autopilot Validation Engine
 * 
 * Functions:
 * 1. Commercial Snapshotting (subtotal, shipping, COD receivable)
 * 2. Pakistani Phone Number Normalization
 * 3. City-to-Courier Mapping Resolution
 * 4. Duplicate Order Detection
 * 5. Full Validation & Classification (AUTO_READY, VERIFY, BLOCKED)
 */

import {
  AutopilotValidationResult,
  CommercialSnapshot,
  ExceptionCode,
  FulfillmentClassification,
} from "./types";
import type { Order } from "@/lib/types";

/**
 * Normalizes Pakistani phone numbers to standard format (e.g. 923001234567).
 * Removes spaces, dashes, + signs. Converts leading 03xx to 923xx.
 */
export function normalizePakistaniPhone(phoneRaw?: string | null): {
  normalized: string;
  isValid: boolean;
} {
  if (!phoneRaw) return { normalized: "", isValid: false };
  let cleaned = phoneRaw.replace(/[\s\-\(\)\+]/g, "").trim();

  // Handle 03001234567 -> 923001234567
  if (/^03\d{9}$/.test(cleaned)) {
    cleaned = "92" + cleaned.slice(1);
  } else if (/^3\d{9}$/.test(cleaned)) {
    cleaned = "92" + cleaned;
  }

  const isValid = /^923\d{9}$/.test(cleaned);
  return { normalized: cleaned, isValid };
}

/**
 * Freezes order financial details into an immutable commercial snapshot.
 */
export function createCommercialSnapshot(order: Order): CommercialSnapshot {
  const subtotal = order.subtotal ?? 0;
  const discount = (order as any).discount ?? 0;
  const shipping = order.shipping ?? 0;
  const total = order.total ?? Math.max(0, subtotal - discount + shipping);

  const isPrepaid = order.payment && order.payment !== "cod" && order.payment !== "Cash on delivery";
  const paidAmount = isPrepaid ? total : 0;
  const codReceivable = Math.max(0, total - paidAmount);

  return {
    subtotal,
    discount,
    shipping,
    total,
    paidAmount,
    codReceivable,
    currency: "PKR",
  };
}

/**
 * Default static mappings for common Pakistani city spelling variations.
 */
const CITY_MAPPINGS: Record<string, { postexCode: string; postexName: string }> = {
  lahore: { postexCode: "LHR", postexName: "Lahore" },
  karachi: { postexCode: "KHI", postexName: "Karachi" },
  islamabad: { postexCode: "ISB", postexName: "Islamabad" },
  rawalpindi: { postexCode: "RWP", postexName: "Rawalpindi" },
  multan: { postexCode: "MUX", postexName: "Multan" },
  faisalabad: { postexCode: "FSD", postexName: "Faisalabad" },
  peshawar: { postexCode: "PEW", postexName: "Peshawar" },
  quetta: { postexCode: "UET", postexName: "Quetta" },
  sialkot: { postexCode: "SKT", postexName: "Sialkot" },
  gujranwala: { postexCode: "GJR", postexName: "Gujranwala" },
  "dera ghazi khan": { postexCode: "DGK", postexName: "DG Khan" },
  "d.g. khan": { postexCode: "DGK", postexName: "DG Khan" },
  "dg khan": { postexCode: "DGK", postexName: "DG Khan" },
  "dera ismail khan": { postexCode: "DIK", postexName: "DI Khan" },
  "d.i. khan": { postexCode: "DIK", postexName: "DI Khan" },
};

/**
 * Resolves customer city string to courier city code.
 */
export function resolveCourierCity(cityRaw?: string | null): {
  cityCode?: string;
  cityName?: string;
  matched: boolean;
} {
  if (!cityRaw) return { matched: false };
  const key = cityRaw.trim().toLowerCase();
  const found = CITY_MAPPINGS[key];
  if (found) {
    return { cityCode: found.postexCode, cityName: found.postexName, matched: true };
  }
  // Generic fallback: if city string length > 2, treat capitalized city as name
  return {
    cityCode: cityRaw.trim(),
    cityName: cityRaw.trim(),
    matched: true,
  };
}

/**
 * Calculates estimated shipping weight in KG from order items.
 */
export function calculateParcelWeight(items?: Order["items"]): number {
  if (!items || items.length === 0) return 0.5; // Default 500g fallback
  let totalWeightGrams = 0;
  for (const item of items) {
    const qty = item.quantity ?? 1;
    // Estimated average accessory weight ~ 200g per item
    totalWeightGrams += 200 * qty;
  }
  // Add 100g outer box packaging
  totalWeightGrams += 100;
  return Math.max(0.3, Math.round((totalWeightGrams / 1000) * 100) / 100);
}

/**
 * Runs full Autopilot Validation on an incoming VoltGear Order.
 */
export function validateOrderForAutopilot(
  order: Order,
  recentOrders: Order[] = []
): AutopilotValidationResult {
  const exceptions: { code: ExceptionCode; reason: string }[] = [];
  const customer = order.customer || {};

  // 1. Phone Normalization Check
  const { normalized: normalizedPhone, isValid: phoneValid } = normalizePakistaniPhone(customer.phone);
  if (!phoneValid) {
    exceptions.push({
      code: "PHONE_INVALID_FORMAT",
      reason: `Customer phone number "${customer.phone || ""}" could not be formatted to a valid Pakistani mobile number (03xx / +923xx).`,
    });
  }

  // 2. Address & City Check
  if (!customer.address || customer.address.trim().length < 8) {
    exceptions.push({
      code: "ADDRESS_CITY_UNSUPPORTED",
      reason: "Delivery street address is missing or too short to be verified.",
    });
  }

  const cityRes = resolveCourierCity(customer.city);
  if (!cityRes.matched) {
    exceptions.push({
      code: "ADDRESS_CITY_UNSUPPORTED",
      reason: `City "${customer.city || "Unknown"}" requires merchant city mapping for courier booking.`,
    });
  }

  // 3. Duplicate Order Screening (within 15 minute window)
  let isDuplicate = false;
  let duplicateOfOrderId: string | undefined;

  const currentCreatedTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now();
  for (const prev of recentOrders) {
    if (prev.orderId === order.orderId) continue;
    const prevTime = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
    const diffMins = Math.abs(currentCreatedTime - prevTime) / (1000 * 60);

    if (diffMins <= 15) {
      const samePhone =
        prev.customer?.phone &&
        normalizePakistaniPhone(prev.customer.phone).normalized === normalizedPhone;
      const sameTotal = prev.total === order.total;

      if (samePhone || sameTotal) {
        isDuplicate = true;
        duplicateOfOrderId = prev.orderId;
        exceptions.push({
          code: "DUPLICATE_ORDER_SUSPECTED",
          reason: `Potential duplicate of Order #${prev.orderId} placed within ${Math.round(diffMins)} minutes.`,
        });
        break;
      }
    }
  }

  // 4. Commercial Snapshot & COD check
  const snapshot = createCommercialSnapshot(order);
  if (snapshot.codReceivable > 25000) {
    exceptions.push({
      code: "HIGH_VALUE_COD_REVIEW",
      reason: `High value COD order (Rs. ${snapshot.codReceivable.toLocaleString()}) requires manual merchant verification.`,
    });
  }

  // Determine Final Classification
  let classification: FulfillmentClassification = "AUTO_READY";

  if (exceptions.some((e) => e.code === "PHONE_INVALID_FORMAT" || e.code === "ADDRESS_CITY_UNSUPPORTED")) {
    classification = "BLOCKED";
  } else if (exceptions.length > 0) {
    classification = "VERIFY";
  }

  return {
    classification,
    commercialSnapshot: snapshot,
    normalizedPhone,
    isDuplicate,
    duplicateOfOrderId,
    exceptions,
    suggestedCourier: "POSTEX",
    courierCityCode: cityRes.cityCode,
    calculatedWeightKg: calculateParcelWeight(order.items),
  };
}
