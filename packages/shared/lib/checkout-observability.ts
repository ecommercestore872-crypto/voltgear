/** Structured checkout logs for Vercel Observability (no PII). */

export type CheckoutOutcome =
  | "success"
  | "replayed"
  | "validation"
  | "rate_limit"
  | "price_changed"
  | "promo_error"
  | "create_failed"
  | "server_error";

export function checkoutSloLog(fields: {
  outcome: CheckoutOutcome;
  status: number;
  durationMs: number;
  itemCount?: number;
  replayed?: boolean;
  code?: string;
}): void {
  console.info(
    "[checkout-slo]",
    JSON.stringify({
      ...fields,
      durationMs: Math.max(0, Math.round(fields.durationMs)),
      ts: new Date().toISOString(),
    }),
  );
}

/** Target: public checkout p95 under 3s; alert in Observability if p95 > 4s sustained. */
export const CHECKOUT_P95_TARGET_MS = 3_000;
export const CHECKOUT_P95_ALERT_MS = 4_000;
