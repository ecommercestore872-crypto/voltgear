import type { OrderStatus } from "@/lib/types";

export type PostExTrackingSnapshot = {
  orderId: string;
  trackingNumber: string;
  rawStatus: string;
  normalizedStatus: OrderStatus | null;
  eventTime: string | null;
  history: unknown[];
};

/** Date-only provider fields are ambiguous; keep their raw value but no timestamp. */
export function parsePostExEventTimestamp(raw: string | null): string | null {
  if (!raw || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(raw)) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
