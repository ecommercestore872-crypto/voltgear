import crypto from "node:crypto";
import { isIP } from "node:net";
import { metaCommerceData, metaEnvironmentAllowed, type MetaItem } from "./meta-commerce";
import { purchaseTrackLog } from "./purchase-track-observability";

export const META_CURRENCY = "PKR";
// Current version in Meta's official Business SDK (verified 2026-11-02).
export const META_GRAPH_API_VERSION = "v26.0";
type PurchaseInput = {
  orderId: string; value: number; items: MetaItem[]; consent?: string | null;
  eventTime?: number; email?: string; phone?: string;
  clientIp?: string; userAgent?: string;
  eventSourceUrl?: string; fbp?: string; fbc?: string;
};
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Normalized PII only enters hashed user_data; URLs never carry customer data. */
export function buildMetaServerPurchasePayload(input: PurchaseInput) {
  const data = metaCommerceData(input.items, input.value);
  const id = input.orderId?.trim();
  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  if (!id || !data || !Number.isSafeInteger(eventTime) || eventTime <= 0 ||
    eventTime > Math.floor(Date.now() / 1000) + 60 || eventTime < Math.floor(Date.now() / 1000) - 7 * 86400) return null;
  const user: Record<string, string | string[]> = {};
  const email = input.email?.trim().toLowerCase();
  if (email && email.length <= 254 && !email.endsWith("@orders.buyntryy.com") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) user.em = [hash(email)];
  let phone = input.phone?.replace(/\D/g, "") ?? "";
  if (phone.startsWith("0092")) phone = phone.slice(2);
  if (/^03\d{9}$/.test(phone)) phone = `92${phone.slice(1)}`;
  if (/^3\d{9}$/.test(phone)) phone = `92${phone}`;
  if (/^923\d{9}$/.test(phone)) user.ph = [hash(phone)];
  // Additional matching fields are optional; minimize the data sent.
  if (input.clientIp && isIP(input.clientIp)) user.client_ip_address = input.clientIp;
  if (input.userAgent) user.client_user_agent = input.userAgent.slice(0, 1024);
  if (validMetaCookie(input.fbp)) user.fbp = input.fbp!;
  if (validMetaCookie(input.fbc)) user.fbc = input.fbc!;
  if (!Object.keys(user).length) return null;
  return { data: [{
    event_name: "Purchase", event_time: eventTime, action_source: "website",
    event_id: id, event_source_url: "https://buyntryy.com/checkout",
    user_data: user, custom_data: { ...data, order_id: id },
  }] };
}

export function validMetaCookie(value?: string): boolean {
  return typeof value === "string" && value.length <= 512 && /^fb\.\d+\.\d{10,16}\.[A-Za-z0-9_-]+$/.test(value);
}

/** Two bounded attempts. Every retry reuses the exact event ID/time/body. */
export async function trackMetaServerPurchase(input: PurchaseInput): Promise<void> {
  const orderId = input.orderId;
  if (input.consent !== "all") {
    purchaseTrackLog({ channel: "meta", outcome: "skipped_consent", orderId }); return;
  }
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const testMode = process.env.NEXT_PUBLIC_META_TEST_MODE;
  const environmentBlocked = (testMode !== "true" && process.env.VERCEL_ENV !== "production") ||
    (process.env.NODE_ENV !== "production" && testMode !== "true");
  const pixelAllowed = metaEnvironmentAllowed({
    pixelId, testMode, vercelEnv: process.env.VERCEL_ENV, host: "buyntryy.com",
  });
  const skipReason = !token ? "missing_token" :
    environmentBlocked ? "environment_blocked" :
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "false" ? "pixel_disabled" :
    !pixelAllowed ? "pixel_configuration" :
    (testMode === "true" && !process.env.META_TEST_EVENT_CODE) ||
    (testMode !== "true" && process.env.META_TEST_EVENT_CODE) ? "test_code_configuration" : null;
  if (skipReason) {
    purchaseTrackLog({ channel: "meta", outcome: "skipped_config", orderId, reason: skipReason }); return;
  }
  const body = buildMetaServerPurchasePayload(input);
  const version = process.env.META_GRAPH_API_VERSION || META_GRAPH_API_VERSION;
  if (!/^v(2[4-6])\.0$/.test(version)) {
    purchaseTrackLog({ channel: "meta", outcome: "skipped_config", orderId, reason: "invalid_api_version", attempts: 0 }); return;
  }
  if (!body) {
    purchaseTrackLog({ channel: "meta", outcome: "failed", orderId, reason: "invalid_payload", attempts: 0 }); return;
  }
  const payload = JSON.stringify({ ...body, ...(testMode === "true" ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) });
  let httpStatus: number | undefined;
  let providerCode: number | undefined;
  let reason: "provider_rejected" | "timeout" | "network" = "network";
  let attempts = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    attempts = attempt + 1;
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${pixelId}/events`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payload, signal: AbortSignal.timeout(4000), cache: "no-store", redirect: "error",
      });
      httpStatus = res.status;
      const result = await res.json().catch(() => null) as { events_received?: number; error?: { is_transient?: boolean; code?: number } } | null;
      if (res.ok && !result?.error && result?.events_received === 1) {
        purchaseTrackLog({ channel: "meta", outcome: "sent", orderId, attempts, httpStatus }); return;
      }
      reason = "provider_rejected";
      providerCode = typeof result?.error?.code === "number" ? result.error.code : undefined;
      if (attempt === 0 && (res.status === 429 || res.status >= 500 || result?.error?.is_transient)) continue;
      break;
    } catch (error) {
      // Never log request exceptions: they can embed tokens or user_data.
      reason = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" : "network";
      if (attempt === 0) continue;
    }
  }
  purchaseTrackLog({ channel: "meta", outcome: "failed", orderId, attempts, httpStatus, providerCode, reason });
}
