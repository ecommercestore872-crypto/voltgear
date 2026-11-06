import { getServiceClient } from "@/lib/supabase/server";
import { META_GRAPH_API_VERSION } from "@/lib/meta-events-api";
import { metaEnvironmentAllowed } from "@/lib/meta-commerce";
import { purchaseTrackLog } from "@/lib/purchase-track-observability";

type Row = {
  id: string;
  order_id: string;
  lease_token: string;
  event_time: string;
  attempts: number;
  payload: { data?: Array<{ event_id?: string; event_name?: string }> };
};
type Outcome = {
  delivered: boolean;
  httpStatus?: number;
  reason?: "timeout" | "network" | "rate_limit" | "provider_rejected" | "invalid_response" | "configuration";
  retryAfterSeconds?: number;
};

function retryAfterSeconds(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const seconds = /^\d+$/.test(raw.trim()) ? Number(raw.trim()) :
    Math.ceil((Date.parse(raw) - Date.now()) / 1000);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 21600) : undefined;
}

/** One provider attempt per claimed lease. A timeout retains the same event ID. */
export async function sendMetaOutboxRow(
  row: Row,
  fetchImpl: typeof fetch = fetch,
): Promise<Outcome> {
  const event = row.payload?.data?.[0];
  if (row.payload?.data?.length !== 1 || event?.event_name !== "Purchase" ||
      event.event_id !== row.order_id) return { delivered: false, reason: "invalid_response" };
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const testMode = process.env.NEXT_PUBLIC_META_TEST_MODE;
  const version = process.env.META_GRAPH_API_VERSION || META_GRAPH_API_VERSION;
  if (!token || !/^v(2[4-6])\.0$/.test(version) ||
      process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "false" ||
      (testMode !== "true" && (process.env.VERCEL_ENV !== "production" || process.env.NODE_ENV !== "production")) ||
      !metaEnvironmentAllowed({ pixelId, testMode, vercelEnv: process.env.VERCEL_ENV, host: "buyntryy.com" }) ||
      (testMode === "true" && !process.env.META_TEST_EVENT_CODE) ||
      (testMode !== "true" && Boolean(process.env.META_TEST_EVENT_CODE))) {
    return { delivered: false, reason: "configuration" };
  }
  if (Date.now() - Date.parse(row.event_time) >= (6 * 86400 + 23 * 3600) * 1000) {
    return { delivered: false, reason: "invalid_response" };
  }
  try {
    const res = await fetchImpl(`https://graph.facebook.com/${version}/${pixelId}/events`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...row.payload, ...(testMode === "true" ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) }),
      signal: AbortSignal.timeout(4000), cache: "no-store", redirect: "error",
    });
    const result = await res.json().catch(() => null) as { events_received?: number; error?: unknown } | null;
    if (res.ok && !result?.error && result?.events_received === 1) {
      return { delivered: true, httpStatus: res.status };
    }
    return {
      delivered: false, httpStatus: res.status,
      reason: res.status === 429 ? "rate_limit" : result ? "provider_rejected" : "invalid_response",
      retryAfterSeconds: retryAfterSeconds(res.headers.get("retry-after")),
    };
  } catch (error) {
    return { delivered: false, reason: error instanceof Error &&
      ["AbortError", "TimeoutError"].includes(error.name) ? "timeout" : "network" };
  }
}

/** Uses row locks and lease tokens in the database for concurrent workers. */
export async function processMetaPurchaseOutbox(limit = 5, orderId?: string): Promise<{ claimed: number; delivered: number; failed: number }> {
  const db = getServiceClient();
  const { data, error } = await db.rpc("claim_meta_purchase_outbox", {
    p_limit: Math.min(Math.max(Math.trunc(limit), 1), 20), p_order_id: orderId ?? null,
  });
  if (error) {
    console.error("[meta-outbox] claim failed");
    return { claimed: 0, delivered: 0, failed: 1 };
  }
  const rows = (data ?? []) as Row[];
  let delivered = 0;
  let failed = 0;
  for (const row of rows) {
    const outcome = await sendMetaOutboxRow(row);
    const { data: finished, error: finishError } = await db.rpc("finish_meta_purchase_outbox", {
      p_id: row.id, p_lease_token: row.lease_token, p_delivered: outcome.delivered,
      p_http_status: outcome.httpStatus ?? null, p_reason: outcome.reason ?? null,
      p_retry_after_seconds: outcome.retryAfterSeconds ?? null,
    });
    if (finishError || finished !== true) {
      console.error("[meta-outbox] finish failed");
      failed++;
      continue;
    }
    if (outcome.delivered) delivered++; else failed++;
    purchaseTrackLog({ channel: "meta", outcome: outcome.delivered ? "sent" : "failed",
      orderId: row.order_id, attempts: row.attempts, httpStatus: outcome.httpStatus,
      reason: outcome.reason === "configuration" ? "missing_token" : undefined });
  }
  return { claimed: rows.length, delivered, failed };
}

export async function processMetaPurchaseOutboxForOrder(orderId: string): Promise<void> {
  await processMetaPurchaseOutbox(1, orderId);
}
