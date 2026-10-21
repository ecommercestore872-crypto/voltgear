import { deferAfterResponse } from "@/lib/defer-after-response";
import { getOrderByPublicId } from "@/lib/db/store-order-store";
import { buildOrderSheetSyncPayload, resolveOrderSheetSyncEndpoint, signOrderSheetSyncPayload } from "@/lib/order-sheet-sync-rules";

type SyncResult =
  | { ok: true; skipped?: "not-configured" | "demo" }
  | { ok: false; error: string };

type SyncEnvironment = {
  GOOGLE_ORDER_SYNC_URL?: string;
  GOOGLE_ORDER_SYNC_SECRET?: string;
};

function runtimeEnvironment(): SyncEnvironment {
  return {
    GOOGLE_ORDER_SYNC_URL: process.env.GOOGLE_ORDER_SYNC_URL,
    GOOGLE_ORDER_SYNC_SECRET: process.env.GOOGLE_ORDER_SYNC_SECRET,
  };
}

function configuration(env: SyncEnvironment = runtimeEnvironment()):
  | { configured: false }
  | { configured: true; endpoint: string; secret: string } {
  const endpoint = resolveOrderSheetSyncEndpoint(env.GOOGLE_ORDER_SYNC_URL);
  const secret = env.GOOGLE_ORDER_SYNC_SECRET?.trim() || "";
  if (!endpoint && !secret) return { configured: false };
  if (!endpoint || secret.length < 32) {
    throw new Error("Google order sync requires a valid URL and a secret of at least 32 characters.");
  }
  return { configured: true, endpoint, secret };
}

async function deliverOrder(
  orderId: string,
  env?: SyncEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<SyncResult> {
  let config;
  try {
    config = configuration(env);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid sync configuration." };
  }
  if (!config.configured) return { ok: true, skipped: "not-configured" };

  const order = await getOrderByPublicId(orderId);
  if (!order) return { ok: false, error: "Order no longer exists." };
  if (order.isDemo) return { ok: true, skipped: "demo" };

  try {
    const payload = buildOrderSheetSyncPayload(order);
    const envelope = signOrderSheetSyncPayload(payload, config.secret);
    const response = await fetcher(config.endpoint, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(envelope),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let result: { ok?: boolean; error?: string } | null = null;
    if (contentType.includes("application/json") || text.trim().startsWith("{")) {
      result = JSON.parse(text) as { ok?: boolean; error?: string };
    }
    if (!response.ok || !result?.ok) {
      const reason = result?.error || `Google Apps Script returned HTTP ${response.status}.`;
      return { ok: false, error: reason };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Google Sheets delivery failed.",
    };
  }
}

export async function syncOrderToGoogleSheet(
  orderId: string,
  env?: SyncEnvironment,
): Promise<SyncResult> {
  try {
    const result = await deliverOrder(orderId, env);
    if (!result.ok) console.error("[order-sheet-sync] Delivery failed; retry through the admin sync endpoint.");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order sheet synchronization failed.";
    console.error("[order-sheet-sync]", message);
    return { ok: false, error: message };
  }
}

/** Schedule best-effort delivery without extending an admin or tracking response. */
export function scheduleOrderSheetSync(orderId: string): void {
  const normalized = orderId.trim();
  if (!normalized) return;
  deferAfterResponse(() => syncOrderToGoogleSheet(normalized));
}
