import type { OrderStatus } from "@/lib/types";

import type { NormalizedDeliveryStatus } from "./rescue-types";

export function orderStatusFromCourier(status: NormalizedDeliveryStatus): OrderStatus | null {
  if (status === "DELIVERED") return "delivered";
  return null;
}

export function extractPostExRawStatus(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const rec = data as Record<string, unknown>;
  const dist = rec.dist && typeof rec.dist === "object" ? (rec.dist as Record<string, unknown>) : rec;
  for (const key of ["transactionStatus", "orderStatus", "status", "currentStatus"]) {
    if (typeof dist[key] === "string" && dist[key].trim()) return String(dist[key]);
  }
  if (typeof rec.statusMessage === "string") return rec.statusMessage;
  return "";
}
