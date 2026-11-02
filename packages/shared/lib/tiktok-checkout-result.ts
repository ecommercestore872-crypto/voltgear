import { buildPurchasePayload, trackTikTokPurchase } from "./tiktok-browser-events";

/** Only a successful API response with the persisted snapshot can convert. */
export function acceptedTikTokPurchase(status: number, data: unknown): Parameters<typeof trackTikTokPurchase>[0] | null {
  if (status < 200 || status >= 300 || !data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.ok !== true || row.isDemo === true || typeof row.orderId !== "string" || typeof row.total !== "number" || !Array.isArray(row.lines)) return null;
  const input = { orderId: row.orderId, total: row.total, lines: row.lines };
  try { return buildPurchasePayload(input) ? input : null; } catch { return null; }
}

export function trackAcceptedTikTokPurchase(status: number, data: unknown): string | null {
  const input = acceptedTikTokPurchase(status, data);
  return input ? trackTikTokPurchase(input) : null;
}
