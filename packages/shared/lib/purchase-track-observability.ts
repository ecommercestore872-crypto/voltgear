import { createHmac } from "node:crypto";

/** Server-side Purchase attempt logs for order reconciliation without PII. */

export type PurchaseTrackChannel = "tiktok" | "meta";

export type PurchaseTrackOutcome =
  | "sent"
  | "failed"
  | "skipped_consent"
  | "skipped_config"
  | "skipped_demo";

export type PurchaseTrackReason =
  | "missing_token"
  | "environment_blocked"
  | "pixel_disabled"
  | "pixel_configuration"
  | "test_code_configuration"
  | "invalid_api_version"
  | "invalid_payload"
  | "provider_rejected"
  | "timeout"
  | "network"
  | "unexpected";

/** Opaque reference. Sequential order IDs must never be hashed without a key. */
export function purchaseTrackOrderRef(orderId: string): string | undefined {
  const id = orderId.trim();
  const key = process.env.PURCHASE_TRACK_LOG_HMAC_KEY || process.env.AUTH_SECRET || process.env.ADMIN_TOKEN;
  if (!id || !key || key.length < 16) return undefined;
  return createHmac("sha256", key).update("purchase-track:v1:").update(id).digest("hex").slice(0, 20);
}

export function purchaseTrackLog(fields: {
  channel: PurchaseTrackChannel;
  outcome: PurchaseTrackOutcome;
  orderId?: string;
  attempts?: number;
  httpStatus?: number;
  providerCode?: number;
  reason?: PurchaseTrackReason;
}): void {
  console.info(
    "[purchase-track]",
    JSON.stringify({
      channel: fields.channel,
      outcome: fields.outcome,
      orderRef: fields.orderId ? purchaseTrackOrderRef(fields.orderId) : undefined,
      attempts: fields.attempts,
      httpStatus: fields.httpStatus,
      providerCode: fields.providerCode,
      reason: fields.reason,
      ts: new Date().toISOString(),
    }),
  );
}
