/**
 * TikTok Pixel browser ecommerce events (fail-open).
 * Base Pixel loader stays in components/analytics/tiktok-pixel.tsx — do not duplicate it here.
 */

import { shouldLoadTikTokPixel } from "@/lib/tiktok-pixel-rules";
import { normalizePhone } from "@/lib/messaging";

export const TIKTOK_CURRENCY = "PKR" as const;

export type TikTokConsent = "all" | "essential" | null;

export type TikTokContentItem = {
  content_id: string;
  content_type: "product";
  content_name: string;
  content_category?: string;
  price?: number;
  num_items?: number;
};

type Ttq = {
  track?: (event: string, payload?: Record<string, unknown>, options?: { event_id?: string }) => void;
  identify?: (payload: Record<string, string>) => void;
};

declare global {
  interface Window {
    ttq?: Ttq;
  }
}

export function resolveTikTokContentId(input: {
  variantSku?: string | null;
  sku?: string | null;
  slug?: string | null;
  variantKey?: string | null;
}): string | null {
  const variantSku = (input.variantSku ?? "").trim();
  if (variantSku) return variantSku;
  const sku = (input.sku ?? "").trim();
  if (sku) return sku;
  const slug = (input.slug ?? "").trim();
  if (!slug) return null;
  const variantKey = (input.variantKey ?? "").trim();
  return variantKey ? `${slug}::${variantKey}` : slug;
}

function isPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function isNonNegFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function canSendTikTokBrowserEvents(input: {
  pixelId?: string | null;
  enabled?: string | boolean | null;
  consent: TikTokConsent;
  pathname?: string | null;
  nodeEnv?: string | null;
  host?: string | null;
}): boolean {
  return shouldLoadTikTokPixel(input);
}

function readBrowserGate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const consentRaw = window.localStorage.getItem("bnt-cookie-consent");
    const consent: TikTokConsent =
      consentRaw === "all" || consentRaw === "essential" ? consentRaw : null;
    return canSendTikTokBrowserEvents({
      pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
      enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
      consent,
      pathname: window.location.pathname,
      nodeEnv: process.env.NODE_ENV,
      host: window.location.hostname,
    });
  } catch {
    return false;
  }
}

function getTtq(): Ttq | null {
  if (typeof window === "undefined") return null;
  const ttq = window.ttq;
  if (!ttq || typeof ttq.track !== "function") return null;
  return ttq;
}

export function newTikTokEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function purchaseEventId(orderId: string): string {
  return `purchase_${String(orderId).trim()}`;
}

export function normalizeTikTokEmail(raw: string): string | null {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function normalizeTikTokPhone(raw: string): string | null {
  return normalizePhone(raw);
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function buildViewContentPayload(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  sku?: string;
  variantSku?: string;
  variantKey?: string;
}): { contents: TikTokContentItem[]; value: number; currency: typeof TIKTOK_CURRENCY } | null {
  const content_id = resolveTikTokContentId(input);
  const name = (input.name ?? "").trim();
  if (!content_id || !name || !isPositiveFinite(input.price)) return null;
  const category = (input.category ?? "").trim();
  const item: TikTokContentItem = {
    content_id,
    content_type: "product",
    content_name: name,
    price: input.price,
    num_items: 1,
  };
  if (category) item.content_category = category;
  return { contents: [item], value: input.price, currency: TIKTOK_CURRENCY };
}

export function buildWishlistPayload(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  sku?: string;
}): ReturnType<typeof buildViewContentPayload> {
  return buildViewContentPayload({ ...input, price: input.price });
}

export function buildSearchPayload(
  searchString: string
): { search_string: string } | null {
  const q = (searchString ?? "").trim();
  if (!q) return null;
  return { search_string: q };
}

export function buildAddToCartPayload(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  sku?: string;
  variantSku?: string;
  variantKey?: string;
}): { contents: TikTokContentItem[]; value: number; currency: typeof TIKTOK_CURRENCY } | null {
  const content_id = resolveTikTokContentId(input);
  const name = (input.name ?? "").trim();
  const quantity = input.quantity;
  if (!content_id || !name || !isPositiveFinite(input.price) || !isPositiveFinite(quantity)) {
    return null;
  }
  const category = (input.category ?? "").trim();
  const item: TikTokContentItem = {
    content_id,
    content_type: "product",
    content_name: name,
    price: input.price,
    num_items: quantity,
  };
  if (category) item.content_category = category;
  return {
    contents: [item],
    value: input.price * quantity,
    currency: TIKTOK_CURRENCY,
  };
}

export function buildInitiateCheckoutPayload(
  items: Array<{
    slug: string;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    variantSku?: string;
    variantKey?: string;
  }>,
  /** Prefer checkout page customer-facing total when known; else merchandise sum. */
  valueOverride?: number
): { contents: TikTokContentItem[]; value: number; currency: typeof TIKTOK_CURRENCY } | null {
  if (!items.length) return null;
  const contents: TikTokContentItem[] = [];
  let merchandise = 0;
  for (const line of items) {
    const content_id = resolveTikTokContentId(line);
    const name = (line.name ?? "").trim();
    if (!content_id || !name || !isPositiveFinite(line.price) || !isPositiveFinite(line.quantity)) {
      return null;
    }
    contents.push({
      content_id,
      content_type: "product",
      content_name: name,
      num_items: line.quantity,
    });
    merchandise += line.price * line.quantity;
  }
  const value = isNonNegFinite(valueOverride) ? valueOverride : merchandise;
  if (!contents.length || !isNonNegFinite(value)) return null;
  return { contents, value, currency: TIKTOK_CURRENCY };
}

export function buildPurchasePayload(input: {
  orderId: string;
  total: number;
  lines: Array<{
    slug?: string;
    name?: string;
    quantity?: number;
    variantSku?: string;
    variantKey?: string;
    sku?: string;
    category?: string;
  }>;
}): { contents: TikTokContentItem[]; value: number; currency: typeof TIKTOK_CURRENCY } | null {
  const orderId = (input.orderId ?? "").trim();
  if (!orderId || !isNonNegFinite(input.total) || !Number.isFinite(input.total)) return null;
  if (!input.lines?.length) return null;

  const contents: TikTokContentItem[] = [];
  for (const line of input.lines) {
    const content_id = resolveTikTokContentId({
      variantSku: line.variantSku,
      sku: line.sku,
      slug: line.slug,
      variantKey: line.variantKey,
    });
    const name = (line.name ?? "").trim();
    const quantity = line.quantity;
    if (!content_id || !name || !isPositiveFinite(quantity)) return null;
    const item: TikTokContentItem = {
      content_id,
      content_type: "product",
      content_name: name,
      num_items: quantity,
    };
    const category = (line.category ?? "").trim();
    if (category) item.content_category = category;
    contents.push(item);
  }
  if (!contents.length) return null;
  return { contents, value: input.total, currency: TIKTOK_CURRENCY };
}

export function checkoutCartFingerprint(
  items: Array<{ slug: string; variantKey?: string; quantity: number }>
): string {
  return items
    .map((i) => {
      const key = i.variantKey ? `${i.slug}::${i.variantKey}` : i.slug;
      return `${key}:${i.quantity}`;
    })
    .sort()
    .join("|");
}

export function initiateCheckoutDedupeKey(fingerprint: string): string {
  return `checkout:${fingerprint}`;
}

type StringStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Gate: non-empty cart + checkout pricing state settled (no sleeps). */
export function isCheckoutPricingReadyForInitiateCheckout(input: {
  hasItems: boolean;
  dealQuoteReady: boolean;
  promoLoading?: boolean;
}): boolean {
  if (!input.hasItems) return false;
  if (!input.dealQuoteReady) return false;
  if (input.promoLoading) return false;
  return true;
}

/**
 * Pure attempt planner for InitiateCheckout (testable without ttq / timers).
 * Applies readiness + cart-fingerprint dedupe + resolved total payload.
 */
export function planTikTokInitiateCheckout(input: {
  items: Array<{
    slug: string;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    variantSku?: string;
    variantKey?: string;
  }>;
  total: number;
  dealQuoteReady: boolean;
  promoLoading?: boolean;
  store?: StringStore | Map<string, string>;
}): {
  fired: boolean;
  reason?: "empty" | "pricing_unresolved" | "duplicate" | "invalid_payload";
  fingerprint?: string;
  value?: number;
  payload?: NonNullable<ReturnType<typeof buildInitiateCheckoutPayload>>;
} {
  if (!input.items.length) {
    return { fired: false, reason: "empty" };
  }
  if (
    !isCheckoutPricingReadyForInitiateCheckout({
      hasItems: true,
      dealQuoteReady: input.dealQuoteReady,
      promoLoading: input.promoLoading,
    })
  ) {
    return { fired: false, reason: "pricing_unresolved" };
  }
  const fingerprint = checkoutCartFingerprint(input.items);
  if (!shouldFireInitiateCheckout(fingerprint, input.store)) {
    return { fired: false, reason: "duplicate", fingerprint };
  }
  const payload = buildInitiateCheckoutPayload(input.items, input.total);
  if (!payload) {
    return { fired: false, reason: "invalid_payload", fingerprint };
  }
  return {
    fired: true,
    fingerprint,
    value: payload.value,
    payload,
  };
}

function memoryStore(): StringStore & Map<string, string> {
  const map = new Map<string, string>();
  return Object.assign(map, {
    getItem(key: string) {
      return map.has(key) ? (map.get(key) as string) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  });
}

const viewContentRecent = new Map<string, number>();
const VIEW_CONTENT_WINDOW_MS = 2000;

export function shouldFireViewContentOnce(contentId: string): boolean {
  const id = contentId.trim();
  if (!id) return false;
  const now = Date.now();
  const prev = viewContentRecent.get(id) ?? 0;
  if (now - prev < VIEW_CONTENT_WINDOW_MS) return false;
  viewContentRecent.set(id, now);
  return true;
}
shouldFireViewContentOnce.reset = () => viewContentRecent.clear();

export function isInitiateCheckoutMarked(
  fingerprint: string,
  store?: StringStore | Map<string, string>
): boolean {
  const fp = fingerprint.trim();
  if (!fp) return true;
  const key = initiateCheckoutDedupeKey(fp);
  const s =
    store ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : memoryStore());
  try {
    if (s instanceof Map) return s.has(key);
    return Boolean(s.getItem(key));
  } catch {
    return false;
  }
}

export function markInitiateCheckout(
  fingerprint: string,
  store?: StringStore | Map<string, string>
): void {
  const fp = fingerprint.trim();
  if (!fp) return;
  const key = initiateCheckoutDedupeKey(fp);
  const s =
    store ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : memoryStore());
  try {
    if (s instanceof Map) s.set(key, "1");
    else s.setItem(key, "1");
  } catch {
    // ignore
  }
}

export function shouldFireInitiateCheckout(
  fingerprint: string,
  store?: StringStore | Map<string, string>
): boolean {
  if (isInitiateCheckoutMarked(fingerprint, store)) return false;
  markInitiateCheckout(fingerprint, store);
  return true;
}
shouldFireInitiateCheckout.reset = () => {
  /* tests use Map */
};

const PURCHASE_PREFIX = "tiktok_purchase:";

export function shouldFirePurchaseOnce(
  orderId: string,
  store?: StringStore | Map<string, string>
): boolean {
  const id = orderId.trim();
  if (!id) return false;
  if (isPurchaseMarked(id, store)) return false;
  markPurchase(id, store);
  return true;
}
shouldFirePurchaseOnce.reset = () => {
  /* tests use Map */
};

export function isPurchaseMarked(
  orderId: string,
  store?: StringStore | Map<string, string>
): boolean {
  const id = orderId.trim();
  if (!id) return true;
  const key = `${PURCHASE_PREFIX}${id}`;
  const s =
    store ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : memoryStore());
  try {
    if (s instanceof Map) return s.has(key);
    return Boolean(s.getItem(key));
  } catch {
    return false;
  }
}

export function markPurchase(
  orderId: string,
  store?: StringStore | Map<string, string>
): void {
  const id = orderId.trim();
  if (!id) return;
  const key = `${PURCHASE_PREFIX}${id}`;
  const s =
    store ??
    (typeof sessionStorage !== "undefined" ? sessionStorage : memoryStore());
  try {
    if (s instanceof Map) s.set(key, "1");
    else s.setItem(key, "1");
  } catch {
    // ignore
  }
}

function safeTrack(
  event: string,
  payload: Record<string, unknown>,
  eventId: string,
  onSuccess?: () => void
): string | null {
  try {
    if (!readBrowserGate()) return null;

    const send = (): boolean => {
      if (!readBrowserGate()) return false;
      const ttq = getTtq();
      if (!ttq?.track) return false;
      ttq.track(event, payload, { event_id: eventId });
      try {
        onSuccess?.();
      } catch {
        // ignore
      }
      return true;
    };

    if (send()) return eventId;

    // Base Pixel Script may mount after PDP/checkout effects (consent race).
    if (typeof window === "undefined") return null;
    let attempts = 0;
    const maxAttempts = 50;
    const timer = window.setInterval(() => {
      attempts += 1;
      try {
        if (send() || attempts >= maxAttempts || !readBrowserGate()) {
          window.clearInterval(timer);
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 100);
    return eventId;
  } catch {
    return null;
  }
}

export function trackTikTokViewContent(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  sku?: string;
  variantSku?: string;
  variantKey?: string;
}): string | null {
  const payload = buildViewContentPayload(input);
  if (!payload) return null;
  const contentId = payload.contents[0]?.content_id;
  if (!contentId || !shouldFireViewContentOnce(contentId)) return null;
  return safeTrack("ViewContent", payload, newTikTokEventId());
}

export function trackTikTokAddToWishlist(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  sku?: string;
}): string | null {
  const payload = buildWishlistPayload(input);
  if (!payload) return null;
  return safeTrack("AddToWishlist", payload, newTikTokEventId());
}

export function trackTikTokSearch(searchString: string): string | null {
  const payload = buildSearchPayload(searchString);
  if (!payload) return null;
  return safeTrack("Search", payload, newTikTokEventId());
}

export function trackTikTokAddToCart(input: {
  slug: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  sku?: string;
  variantSku?: string;
  variantKey?: string;
}): string | null {
  const payload = buildAddToCartPayload(input);
  if (!payload) return null;
  return safeTrack("AddToCart", payload, newTikTokEventId());
}

export function trackTikTokInitiateCheckout(
  items: Array<{
    slug: string;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
    variantSku?: string;
    variantKey?: string;
  }>,
  valueOverride?: number,
  options?: { dealQuoteReady?: boolean; promoLoading?: boolean }
): string | null {
  if (
    !isCheckoutPricingReadyForInitiateCheckout({
      hasItems: items.length > 0,
      dealQuoteReady: options?.dealQuoteReady ?? true,
      promoLoading: options?.promoLoading,
    })
  ) {
    return null;
  }
  const fingerprint = checkoutCartFingerprint(items);
  if (isInitiateCheckoutMarked(fingerprint)) return null;
  const payload = buildInitiateCheckoutPayload(items, valueOverride);
  if (!payload) return null;
  return safeTrack("InitiateCheckout", payload, newTikTokEventId(), () => {
    markInitiateCheckout(fingerprint);
  });
}

export function trackTikTokPurchase(input: {
  orderId: string;
  total: number;
  lines: Array<{
    slug?: string;
    name?: string;
    quantity?: number;
    variantSku?: string;
    variantKey?: string;
    sku?: string;
    category?: string;
  }>;
}): string | null {
  const payload = buildPurchasePayload(input);
  if (!payload) return null;
  if (isPurchaseMarked(input.orderId)) return null;
  return safeTrack(
    "Purchase",
    payload,
    purchaseEventId(input.orderId),
    () => markPurchase(input.orderId)
  );
}

/** Advanced Matching — hashed fields only; omit missing; never invent external_id. */
export async function identifyTikTokCustomer(input: {
  email?: string | null;
  phone?: string | null;
}): Promise<boolean> {
  try {
    if (!readBrowserGate()) return false;

    const email = input.email ? normalizeTikTokEmail(input.email) : null;
    const phone = input.phone ? normalizeTikTokPhone(input.phone) : null;
    const payload: Record<string, string> = {};
    if (email) payload.email = await sha256Hex(email);
    if (phone) payload.phone_number = await sha256Hex(phone);
    if (!Object.keys(payload).length) return false;

    const send = (): boolean => {
      if (!readBrowserGate()) return false;
      const ttq = getTtq();
      if (!ttq?.identify) return false;
      ttq.identify(payload);
      return true;
    };

    if (send()) return true;
    if (typeof window === "undefined") return false;
    return await new Promise((resolve) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;
        try {
          if (send()) {
            window.clearInterval(timer);
            resolve(true);
            return;
          }
          if (attempts >= 50 || !readBrowserGate()) {
            window.clearInterval(timer);
            resolve(false);
          }
        } catch {
          window.clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  } catch {
    return false;
  }
}
