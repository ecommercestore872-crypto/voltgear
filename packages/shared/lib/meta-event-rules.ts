import type { MetaEventName } from "@/lib/meta-events-api";
import { parseCookieConsent } from "@/lib/cookie-consent";
import { metaConsentAllows } from "@/lib/meta-consent";

export type BrowserMetaEvent = {
  eventName: Exclude<MetaEventName, "Purchase">;
  eventId: string;
  /** The visitor's saved banner choice, or null when they have not chosen. */
  consent: string | null;
  pageUrl: string;
  productIds?: string[];
  value?: number;
  numItems?: number;
  /** Already-hashed matching values for a returning, known customer. */
  em?: string;
  ph?: string;
};

const EVENT_NAMES = new Set(["PageView", "ViewContent", "AddToCart", "InitiateCheckout"]);
const SHA256_HEX = /^[a-f0-9]{64}$/;
const PRODUCT_ID = /^[A-Za-z0-9_.:/-]{1,120}$/;

export function parseBrowserMetaEvent(raw: unknown, requestOrigin: string): BrowserMetaEvent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!EVENT_NAMES.has(String(row.eventName))) return null;
  if (row.consent !== null && row.consent !== undefined && parseCookieConsent(row.consent) === null) return null;
  if (!metaConsentAllows(row.consent)) return null;
  const consent = parseCookieConsent(row.consent);
  if (typeof row.eventId !== "string" || !/^[A-Za-z0-9_-]{10,100}$/.test(row.eventId)) return null;
  if (typeof row.pageUrl !== "string" || row.pageUrl.length > 2048) return null;
  let pageUrl: string;
  try {
    const page = new URL(row.pageUrl);
    if (page.origin !== requestOrigin) return null;
    pageUrl = page.origin + page.pathname;
  } catch {
    return null;
  }
  const eventName = row.eventName as BrowserMetaEvent["eventName"];
  const hashes = {
    ...(typeof row.em === "string" && SHA256_HEX.test(row.em) ? { em: row.em } : {}),
    ...(typeof row.ph === "string" && SHA256_HEX.test(row.ph) ? { ph: row.ph } : {}),
  };
  if (eventName === "PageView") return { eventName, eventId: row.eventId, consent, pageUrl, ...hashes };
  if (typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0 || row.value > 100_000_000) return null;
  const productIds = row.productIds;
  if (productIds !== undefined && (!Array.isArray(productIds) || productIds.length > 50 ||
      productIds.some((id) => typeof id !== "string" || !PRODUCT_ID.test(id)))) return null;
  if (eventName !== "InitiateCheckout" && (!Array.isArray(productIds) || productIds.length !== 1)) return null;
  const count = row.numItems;
  if (count !== undefined && (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > 1000)) return null;
  return {
    eventName, eventId: row.eventId, consent, pageUrl, ...hashes,
    ...(Array.isArray(productIds) && productIds.length ? { productIds } : {}),
    value: row.value,
    ...(typeof count === "number" ? { numItems: count } : {}),
  };
}

export function browserMetaCustomData(event: BrowserMetaEvent): Record<string, unknown> | undefined {
  if (event.eventName === "PageView") return undefined;
  return {
    currency: "PKR",
    value: event.value,
    ...(event.productIds ? { content_ids: event.productIds, content_type: "product" } : {}),
    ...(event.numItems ? { num_items: event.numItems } : {}),
  };
}
