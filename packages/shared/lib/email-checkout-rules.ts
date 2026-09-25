import type { NewOrderEmailResult } from "@/lib/email-rules";

/** Order is already persisted — shopper must still see success even if email throws. */
export function checkoutHttpStatusAfterOrderPersisted(
  orderPersisted: boolean,
): 200 | 500 {
  return orderPersisted ? 200 : 500;
}

export function summarizeNewOrderEmailOutcome(
  result: NewOrderEmailResult,
  threw: boolean,
): "ok" | "partial" | "failed" | "exception" {
  if (threw) return "exception";
  if (result.customerSent && (!result.adminTo || result.adminSent)) return "ok";
  if (result.customerSent || result.adminSent) return "partial";
  return "failed";
}
