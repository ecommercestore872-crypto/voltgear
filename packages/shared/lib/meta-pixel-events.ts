import { acceptedMetaPurchase, metaCommerceData, metaEnvironmentAllowed, metaStorefrontPath, type MetaItem } from "./meta-commerce";
import { canSendMetaBrowserEvent } from "./meta-consent";
import { buildMetaHashedCustomer, type MetaCustomer } from "./meta-matching";
import { newMetaEventId } from "./meta-identity";
import { readCookieConsent } from "./cookie-consent";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    __META_PIXEL_LAST_PATHNAME__?: string;
    __META_PAGEVIEW_SEQUENCE__?: number;
    __META_VIEWCONTENT_LAST_KEY__?: string;
    __META_PIXEL_BOOTSTRAPPED__?: boolean;
    __META_INITIATECHECKOUT_LAST_SEQUENCE__?: number;
  }
  interface Navigator { readonly globalPrivacyControl?: boolean; }
}

export function canSendMetaBrowserEvents(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (process.env.NODE_ENV !== "development" || process.env.NEXT_PUBLIC_META_TEST_MODE === "true") &&
      process.env.NEXT_PUBLIC_META_PIXEL_ENABLED !== "false" && canSendMetaBrowserEvent() &&
      metaStorefrontPath(window.location.pathname) &&
      // Pixel includes the document URL automatically. Suppress sensitive legacy URLs.
      !/(email|phone|address|token|password|name)=/i.test(window.location.search) &&
      !window.location.hash &&
      metaEnvironmentAllowed({ pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
        testMode: process.env.NEXT_PUBLIC_META_TEST_MODE, vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
        host: window.location.hostname });
  } catch { return false; }
}

export function ensureMetaPageView(pathname: string): number | null {
  if (!canSendMetaBrowserEvents() || !window.fbq || !metaStorefrontPath(pathname)) return null;
  if (window.__META_PIXEL_LAST_PATHNAME__ !== pathname) {
    if (pathname !== "/checkout") {
      try { window.sessionStorage.removeItem("bnt-meta-checkout"); } catch {}
    }
    track("PageView", {}, newMetaEventId(), { pageView: true });
    window.__META_PIXEL_LAST_PATHNAME__ = pathname;
    window.__META_PAGEVIEW_SEQUENCE__ = (window.__META_PAGEVIEW_SEQUENCE__ || 0) + 1;
  }
  return window.__META_PAGEVIEW_SEQUENCE__ || 1;
}

/** Recheck preferences and route at dispatch; never queue pre-consent actions. */
function whenReady(execute: () => void): void | (() => void) {
  if (!canSendMetaBrowserEvents()) return;
  if (window.fbq && window.__META_PIXEL_BOOTSTRAPPED__) { execute(); return; }
  const path = window.location.pathname;
  const handler = () => {
    cleanup();
    if (canSendMetaBrowserEvents() && window.location.pathname === path) execute();
  };
  const timer = window.setTimeout(() => cleanup(), 15000);
  const cleanup = () => { window.clearTimeout(timer); window.removeEventListener("meta:pixel-ready", handler); };
  window.addEventListener("meta:pixel-ready", handler);
  return cleanup;
}

const KNOWN_CUSTOMER_KEY = "bnt-meta-match";

/**
 * Hashes only (never the raw email or phone) of a visitor who has typed them.
 * New values are merged with what was stored, so entering a phone later never
 * erases an email entered earlier. Only stored with advertising consent.
 */
export function rememberMetaCustomer(customer: MetaCustomer): void {
  if (!canSendMetaBrowserEvents()) return;
  const { em, ph } = buildMetaHashedCustomer(customer);
  if (!em && !ph) return;
  try {
    const next = { ...knownMetaCustomer(), ...(em ? { em } : {}), ...(ph ? { ph } : {}) };
    window.localStorage.setItem(KNOWN_CUSTOMER_KEY, JSON.stringify(next));
  } catch {}
}

export function knownMetaCustomer(): { em?: string; ph?: string } {
  try {
    const row = JSON.parse(window.localStorage.getItem(KNOWN_CUSTOMER_KEY) || "{}");
    const ok = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
    return { ...(ok(row.em) ? { em: row.em } : {}), ...(ok(row.ph) ? { ph: row.ph } : {}) };
  } catch { return {}; }
}

type ServerCopy = { eventName: string; eventId: string; productIds?: string[]; value?: number; numItems?: number };

/**
 * Send the server (Conversions API) copy with the SAME eventId as the pixel call.
 * The first PageView waits briefly for the pixel's _fbp cookie so the server copy
 * can carry it.
 */
function mirrorToServer(copy: ServerCopy): void {
  const send = () => {
    try {
      window.fetch?.("/api/meta/events", {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...copy, consent: readCookieConsent(),
          pageUrl: `${window.location.origin}${window.location.pathname}`, ...knownMetaCustomer(),
        }),
      })?.catch(() => {});
    } catch { /* tracking must never break the page */ }
  };
  let tries = 0;
  const wait = () => {
    if (!/(?:^|;\s*)_fbp=/.test(document.cookie) && tries++ < 5) { window.setTimeout(wait, 200); return; }
    send();
  };
  if (typeof document === "undefined" || typeof window.setTimeout !== "function") return send();
  wait();
}

function track(
  event: string, data: Record<string, unknown>, eventID: string,
  options: { pageView?: boolean } = {},
) {
  window.fbq?.("trackSingle", process.env.NEXT_PUBLIC_META_PIXEL_ID, event, data, { eventID });
  if (event === "Purchase") return; // Purchase has its own database-backed server copy.
  const productIds = Array.isArray(data.content_ids) ? (data.content_ids as string[]) : undefined;
  mirrorToServer({
    eventName: event, eventId: eventID,
    ...(options.pageView ? {} : {
      value: typeof data.value === "number" ? data.value : 0,
      ...(productIds ? { productIds } : {}),
      ...(typeof data.num_items === "number" ? { numItems: data.num_items } : {}),
    }),
  });
}

export function trackMetaViewContent(input: { productId?: string; name?: string; price?: number; category?: string; available?: boolean }): void | (() => void) {
  const data = metaCommerceData([{ ...input, price: input.price!, quantity: 1 }], input.price!);
  if (!data || !input.name?.trim() || input.available === false) return;
  return whenReady(() => {
    const sequence = ensureMetaPageView(window.location.pathname);
    if (!sequence) return;
    const key = `${sequence}:${input.productId}`;
    if (window.__META_VIEWCONTENT_LAST_KEY__ === key) return;
    track("ViewContent", { ...data, content_name: input.name, ...(input.category ? { content_category: input.category } : {}) }, newMetaEventId());
    window.__META_VIEWCONTENT_LAST_KEY__ = key;
  });
}

export function trackMetaAddToCart(input: { productId?: string; name?: string; price?: number; quantity?: number }): void {
  const data = metaCommerceData([{ ...input, price: input.price!, quantity: input.quantity! }], input.price! * input.quantity!);
  if (!data || !input.name?.trim()) return;
  whenReady(() => track("AddToCart", { ...data, content_name: input.name }, newMetaEventId()));
}

export function trackMetaInitiateCheckout(input: { items: MetaItem[]; value: number }): void | (() => void) {
  const data = metaCommerceData(input.items, input.value);
  if (!data) return;
  return whenReady(() => {
    const sequence = ensureMetaPageView(window.location.pathname);
    if (!sequence || window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ === sequence) return;
    const fingerprint = JSON.stringify(data);
    try {
      if (window.sessionStorage.getItem("bnt-meta-checkout") === fingerprint) {
        window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ = sequence;
        return;
      }
      window.sessionStorage.setItem("bnt-meta-checkout", fingerprint);
    } catch {
      // Same-document sequence still prevents rerender duplicates.
    }
    track("InitiateCheckout", data, newMetaEventId());
    window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ = sequence;
  });
}

export async function trackMetaPurchase(input: { orderId: string; items: MetaItem[]; value: number; customer?: MetaCustomer }): Promise<void> {
  const data = metaCommerceData(input.items, input.value);
  const id = input.orderId?.trim();
  if (!id || !data) return;
  const execute = async () => {
    // Browser-only replay is unsafe when storage is denied; CAPI remains independent.
    const send = () => {
      if (!canSendMetaBrowserEvents()) return;
      const key = `bnt-meta-purchase:${process.env.NEXT_PUBLIC_META_PIXEL_ID}:${id}`;
      try {
        if (window.localStorage.getItem(key)) return;
        window.localStorage.setItem(key, "1");
        if (window.localStorage.getItem(key) !== "1") return;
      } catch { return; }
      try {
        if (input.customer) rememberMetaCustomer(input.customer);
        // Each value is hashed exactly once here; an existing digest is never hashed again.
        const matching = { ...knownMetaCustomer(), ...buildMetaHashedCustomer(input.customer ?? {}) };
        if (Object.keys(matching).length) window.fbq?.("init", process.env.NEXT_PUBLIC_META_PIXEL_ID, matching);
        track("Purchase", { ...data, order_id: id }, id);
      }
      catch {
        // The SDK may throw after queueing/transmission. Retain the claim:
        // repeating an uncertain browser-only send can inflate conversions.
      }
    };
    // Without atomic cross-tab locking, use server-only Purchase rather than
    // risk duplicate browser-only conversions from two simultaneous retries.
    if (!window.navigator.locks?.request) return;
    await window.navigator.locks.request(`meta-purchase:${id}`, { signal: AbortSignal.timeout(100) }, send).catch(() => {});
  };
  if (!canSendMetaBrowserEvents()) return;
  if (window.fbq && window.__META_PIXEL_BOOTSTRAPPED__) await execute();
  else whenReady(() => { void execute(); });
}

export async function trackAcceptedMetaPurchase(status: number, data: unknown, customer?: MetaCustomer): Promise<void> {
  const input = acceptedMetaPurchase(status, data);
  if (input) await trackMetaPurchase({ ...input, customer });
}
