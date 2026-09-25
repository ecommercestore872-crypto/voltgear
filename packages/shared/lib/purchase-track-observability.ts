/** Server-side Purchase attempt logs for weekly Vercel vs admin order sanity (no PII). */

export type PurchaseTrackChannel = "tiktok" | "meta";

export type PurchaseTrackOutcome =
  | "sent"
  | "failed"
  | "skipped_consent"
  | "skipped_config"
  | "skipped_demo";

export function purchaseTrackLog(fields: {
  channel: PurchaseTrackChannel;
  outcome: PurchaseTrackOutcome;
}): void {
  console.info(
    "[purchase-track]",
    JSON.stringify({
      ...fields,
      ts: new Date().toISOString(),
    }),
  );
}
