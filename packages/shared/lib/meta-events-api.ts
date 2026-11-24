import { isIP } from "node:net";
import { allowsAdvertising } from "./cookie-consent";
import { metaCommerceData, metaEnvironmentAllowed, type MetaItem } from "./meta-commerce";
import { buildMetaHashedCustomer } from "./meta-matching";

export const META_CURRENCY = "PKR";
export type MetaEventName = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
// Current version in Meta's official Business SDK (verified 2026-11-02).
export const META_GRAPH_API_VERSION = "v26.0";
type PurchaseInput = {
  orderId: string; value: number; items: MetaItem[]; consent?: string | null;
  eventTime?: number; email?: string; phone?: string;
  fullName?: string; city?: string; postalCode?: string; country?: string;
  clientIp?: string; userAgent?: string;
  eventSourceUrl?: string; fbp?: string; fbc?: string; externalId?: string;
};

/** Normalized PII only enters hashed user_data; URLs never carry customer data. */
export function buildMetaServerPurchasePayload(input: PurchaseInput) {
  const data = metaCommerceData(input.items, input.value);
  const id = input.orderId?.trim();
  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  if (!id || !data || !Number.isSafeInteger(eventTime) || eventTime <= 0 ||
    eventTime > Math.floor(Date.now() / 1000) + 60 || eventTime < Math.floor(Date.now() / 1000) - 7 * 86400) return null;
  const email = input.email?.trim().toLowerCase();
  const hashed = buildMetaHashedCustomer({
    email: email && !email.endsWith("@orders.buyntryy.com") && email.length <= 254 ? email : undefined,
    phone: input.phone, fullName: input.fullName, city: input.city,
    postalCode: input.postalCode, country: input.country, externalId: input.externalId,
  });
  const user: Record<string, string | string[]> = Object.fromEntries(
    Object.entries(hashed).map(([key, value]) => [key, [value]]),
  );
  if (input.clientIp && isIP(input.clientIp)) user.client_ip_address = input.clientIp;
  if (input.userAgent) user.client_user_agent = input.userAgent.slice(0, 1024);
  if (validMetaCookie(input.fbp)) user.fbp = input.fbp!;
  if (validMetaCookie(input.fbc)) user.fbc = input.fbc!;
  if (!["em", "ph", "fbp", "fbc", "external_id", "client_ip_address"].some((key) => key in user)) return null;
  return { data: [{
    event_name: "Purchase", event_time: eventTime, action_source: "website",
    event_id: id, event_source_url: "https://buyntryy.com/checkout",
    user_data: user, custom_data: { ...data, order_id: id },
  }] };
}

/**
 * One place that decides whether the server may talk to Meta. The access token
 * is read from the environment only; it is never written into source code.
 */
function metaServerConfig() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
  const testMode = process.env.NEXT_PUBLIC_META_TEST_MODE;
  const environmentBlocked = (testMode !== "true" && process.env.VERCEL_ENV !== "production") ||
    (process.env.NODE_ENV !== "production" && testMode !== "true");
  const pixelAllowed = metaEnvironmentAllowed({
    pixelId, testMode, vercelEnv: process.env.VERCEL_ENV, host: "buyntryy.com",
  });
  const skipReason = !token ? "missing_token" as const :
    environmentBlocked ? "environment_blocked" as const :
    process.env.NEXT_PUBLIC_META_PIXEL_ENABLED === "false" ? "pixel_disabled" as const :
    !pixelAllowed ? "pixel_configuration" as const :
    (testMode === "true" && !process.env.META_TEST_EVENT_CODE) ||
    (testMode !== "true" && process.env.META_TEST_EVENT_CODE) ? "test_code_configuration" as const : null;
  return { pixelId, token, testMode, skipReason };
}

type BrowserSignalInput = {
  eventName: Exclude<MetaEventName, "Purchase">; eventId: string; pageUrl: string;
  customData?: Record<string, unknown>; eventTime?: number;
  clientIp?: string; userAgent?: string; fbp?: string; fbc?: string; externalId?: string;
  /** SHA-256 hex of the normalized email / phone, when the visitor is already known. */
  emHash?: string; phHash?: string;
};

const SHA256_HEX = /^[a-f0-9]{64}$/;

/**
 * PageView / ViewContent / AddToCart / InitiateCheckout copy of a browser event.
 * `event_id` is the exact ID the browser pixel used, so Meta merges the pair.
 * Customer details are only ever sent hashed.
 */
export function buildMetaServerEventPayload(input: BrowserSignalInput) {
  const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(input.eventId) || !input.pageUrl.startsWith("https://")) return null;
  const hashed = buildMetaHashedCustomer({ externalId: input.externalId });
  const user: Record<string, string | string[]> = Object.fromEntries(
    Object.entries(hashed).map(([key, value]) => [key, [value]]),
  );
  if (input.emHash && SHA256_HEX.test(input.emHash)) user.em = [input.emHash];
  if (input.phHash && SHA256_HEX.test(input.phHash)) user.ph = [input.phHash];
  if (input.clientIp && isIP(input.clientIp)) user.client_ip_address = input.clientIp;
  if (input.userAgent) user.client_user_agent = input.userAgent.slice(0, 1024);
  if (validMetaCookie(input.fbp)) user.fbp = input.fbp!;
  if (validMetaCookie(input.fbc)) user.fbc = input.fbc!;
  if (!["em", "ph", "fbp", "fbc", "external_id", "client_ip_address"].some((key) => key in user)) return null;
  return { data: [{
    event_name: input.eventName, event_time: eventTime, action_source: "website",
    event_id: input.eventId, event_source_url: input.pageUrl,
    user_data: user, ...(input.customData ? { custom_data: input.customData } : {}),
  }] };
}

/** One bounded attempt; the browser already counted the event, so no retry storm. */
export async function trackMetaServerEvent(input: BrowserSignalInput & { consent?: string | null }): Promise<boolean> {
  if (!allowsAdvertising(input.consent)) return false;
  const config = metaServerConfig();
  const version = process.env.META_GRAPH_API_VERSION || META_GRAPH_API_VERSION;
  if (config.skipReason || !/^v(2[4-6])\.0$/.test(version)) return false;
  const body = buildMetaServerEventPayload(input);
  if (!body) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${config.pixelId}/events`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
      body: JSON.stringify({ ...body, ...(config.testMode === "true" ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}) }),
      signal: AbortSignal.timeout(4000), cache: "no-store", redirect: "error",
    });
    const result = await res.json().catch(() => null) as { events_received?: number; error?: unknown } | null;
    return res.ok && !result?.error && result?.events_received === 1;
  } catch {
    // Never log request exceptions: they can embed tokens or user_data.
    return false;
  }
}

export function validMetaCookie(value?: string): boolean {
  return typeof value === "string" && value.length <= 512 && /^fb\.\d+\.\d{10,16}\.[A-Za-z0-9_-]+$/.test(value);
}

// There is deliberately no direct "send Purchase now" function here. Purchase
// leaves the server only through the order queue (meta-purchase-outbox.ts),
// which holds one row per order number. A second sender could double count.
