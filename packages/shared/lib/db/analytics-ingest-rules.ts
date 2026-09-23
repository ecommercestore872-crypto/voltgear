export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "product_view",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "checkout_step",
  "checkout_validation_error",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const MAX_ANALYTICS_PATH_LENGTH = 200;
export const MAX_ANALYTICS_SLUG_LENGTH = 180;
export const MAX_ANALYTICS_UTM_LENGTH = 80;
export const MAX_ANALYTICS_CAMPAIGN_LENGTH = 80;
export const MAX_ANALYTICS_CLICK_ID_LENGTH = 2048;
export const MAX_ANALYTICS_REFERRER_LENGTH = 200;

const PAGE_TYPES = new Set([
  "home",
  "catalog",
  "product",
  "cart",
  "checkout",
  "search",
  "content",
  "other",
]);

const VALIDATION_CATEGORIES = new Set([
  "name",
  "email",
  "phone",
  "address",
  "city",
  "empty_cart",
  "price_changed",
  "stock",
  "other",
]);

const UTM_SOURCE_MAP: Record<string, string> = {
  tiktok: "tiktok",
  meta: "meta",
  facebook: "meta",
  google: "google",
  instagram: "meta",
};

const SEARCH_HOST_PATTERNS = ["google.", "bing.", "yahoo.", "duckduckgo."];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedAnalyticsEvent = {
  event_id: string;
  name: AnalyticsEventName;
  path: string;
  page_type: string;
  properties: Record<string, unknown>;
  product_id?: string;
  variant_id?: string;
  product_slug?: string;
};

export type IngestAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_id?: string;
  utm_content?: string;
  utm_term?: string;
  ttclid?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
};

export type FirstTouchFields = {
  source: string;
  medium: string | null;
  campaign: string | null;
  campaign_id: string | null;
  campaign_content: string | null;
  campaign_term: string | null;
  ttclid: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrer: string | null;
  landing_path: string;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_content",
  "utm_term",
  "ttclid",
  "fbclid",
  "gclid",
  "referrer",
] as const;

export type ParseIngestBodyResult =
  | { ok: true; event: ParsedAnalyticsEvent }
  | { ok: false };

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePathname(path: string): string {
  try {
    const url = new URL(path, "https://local.invalid");
    const pathname = url.pathname || "/";
    return truncate(pathname, MAX_ANALYTICS_PATH_LENGTH);
  } catch {
    return "/";
  }
}

export function sanitizeReferrer(referrer: string): string {
  try {
    const url = new URL(referrer);
    return truncate(`${url.origin}${url.pathname}`, MAX_ANALYTICS_REFERRER_LENGTH);
  } catch {
    return "";
  }
}

function mapUtmSource(raw: string): string {
  const normalized = raw.trim().toLowerCase();
  return UTM_SOURCE_MAP[normalized] ?? "other";
}

function isSearchReferrer(referrer: string): boolean {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return SEARCH_HOST_PATTERNS.some((pattern) => host.includes(pattern));
  } catch {
    return false;
  }
}

function isExternalReferrer(referrer: string): boolean {
  try {
    const url = new URL(referrer);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSameOriginReferrer(referrer: string, shopHost?: string): boolean {
  const expected = shopHost?.split(":")[0]?.toLowerCase() ?? "";
  if (!expected) return false;
  try {
    return new URL(referrer).hostname.toLowerCase() === expected;
  } catch {
    return false;
  }
}

export function normalizeSource(input: {
  utm_source?: string;
  utm_campaign?: string;
  ttclid?: string;
  fbclid?: string;
  gclid?: string;
  referrer?: string;
  shopHost?: string;
}): { source: string } {
  const utmSource = asNonEmptyString(input.utm_source);
  if (utmSource) {
    return { source: mapUtmSource(truncate(utmSource, MAX_ANALYTICS_UTM_LENGTH)) };
  }

  const ttclid = asNonEmptyString(input.ttclid);
  if (ttclid) {
    return { source: "tiktok" };
  }

  const fbclid = asNonEmptyString(input.fbclid);
  if (fbclid) {
    return { source: "meta" };
  }

  const gclid = asNonEmptyString(input.gclid);
  if (gclid) {
    return { source: "google" };
  }

  const referrer = asNonEmptyString(input.referrer);
  if (referrer) {
    const sanitized = sanitizeReferrer(referrer);
    if (sanitized && isSameOriginReferrer(sanitized, input.shopHost)) {
      return { source: "direct" };
    }
    if (sanitized && isSearchReferrer(sanitized)) {
      return { source: "organic" };
    }
    if (sanitized && isExternalReferrer(sanitized)) {
      return { source: "referral" };
    }
  }

  return { source: "direct" };
}

export function isAllowedAnalyticsOrigin(origin: string | null | undefined, host: string): boolean {
  if (!origin) {
    return true;
  }

  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const expectedHost = host.split(":")[0]?.toLowerCase() ?? "";
    return originHost === expectedHost;
  } catch {
    return false;
  }
}

type RateLimiterInput = {
  ip?: string;
  sid?: string;
};

type RateLimiterConfig = {
  limit: number;
  windowMs: number;
  maxKeys: number;
};

export function createMemoryRateLimiter(config: RateLimiterConfig) {
  const buckets = new Map<string, number[]>();
  const keyOrder: string[] = [];

  function resolveKey(input: RateLimiterInput): string | null {
    const ip = asNonEmptyString(input.ip);
    if (ip) return `ip:${ip}`;
    const sid = asNonEmptyString(input.sid);
    if (sid) return `sid:${sid}`;
    return null;
  }

  function evictOldestIfNeeded() {
    while (buckets.size >= config.maxKeys && keyOrder.length > 0) {
      const oldestKey = keyOrder.shift();
      if (oldestKey) {
        buckets.delete(oldestKey);
      }
    }
  }

  function prune(timestamps: number[], now: number): number[] {
    const cutoff = now - config.windowMs;
    return timestamps.filter((timestamp) => timestamp > cutoff);
  }

  return {
    take(input: RateLimiterInput): boolean {
      const key = resolveKey(input);
      if (!key) {
        return true;
      }

      const now = Date.now();
      let timestamps = buckets.get(key);

      if (!timestamps) {
        evictOldestIfNeeded();
        timestamps = [];
        buckets.set(key, timestamps);
        keyOrder.push(key);
      }

      timestamps = prune(timestamps, now);

      if (timestamps.length >= config.limit) {
        buckets.set(key, timestamps);
        return false;
      }

      timestamps.push(now);
      buckets.set(key, timestamps);
      return true;
    },
  };
}

function parseEventProperties(
  name: AnalyticsEventName,
  properties: unknown
): Record<string, unknown> | null {
  const raw =
    properties && typeof properties === "object" && !Array.isArray(properties)
      ? (properties as Record<string, unknown>)
      : {};

  switch (name) {
    case "page_view":
    case "product_view":
    case "checkout_started":
      return {};
    case "add_to_cart":
    case "remove_from_cart": {
      if (!("quantity" in raw)) {
        return null;
      }
      const quantity = raw.quantity;
      if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
        return null;
      }
      return { quantity };
    }
    case "checkout_step": {
      const step = raw.step;
      if (step !== "details" && step !== "confirm") {
        return null;
      }
      return { step };
    }
    case "checkout_validation_error": {
      const category = raw.category;
      if (typeof category !== "string" || !VALIDATION_CATEGORIES.has(category)) {
        return null;
      }
      return { category };
    }
    default:
      return null;
  }
}

export function parseIngestBody(body: unknown): ParseIngestBodyResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false };
  }

  const input = body as Record<string, unknown>;
  const eventId = asNonEmptyString(input.event_id);
  if (!eventId || !isUuid(eventId)) {
    return { ok: false };
  }

  const name = asNonEmptyString(input.name);
  if (!name || !ANALYTICS_EVENT_NAMES.includes(name as AnalyticsEventName)) {
    return { ok: false };
  }
  const eventName = name as AnalyticsEventName;

  const pageType = asNonEmptyString(input.page_type);
  if (!pageType || !PAGE_TYPES.has(pageType)) {
    return { ok: false };
  }

  const pathValue = typeof input.path === "string" ? input.path : "/";
  const path = normalizePathname(pathValue);

  const properties = parseEventProperties(eventName, input.properties);
  if (properties === null) {
    return { ok: false };
  }

  const event: ParsedAnalyticsEvent = {
    event_id: eventId,
    name: eventName,
    path,
    page_type: pageType,
    properties,
  };

  const productId = asNonEmptyString(input.product_id);
  if (productId && isUuid(productId)) {
    event.product_id = productId;
  }

  const variantId = asNonEmptyString(input.variant_id);
  if (variantId && isUuid(variantId)) {
    event.variant_id = variantId;
  }

  const productSlug = asNonEmptyString(input.product_slug);
  if (productSlug) {
    event.product_slug = truncate(productSlug, MAX_ANALYTICS_SLUG_LENGTH);
  }

  return { ok: true, event };
}

export function ingestLogFields(input: {
  reason: string;
  name?: string;
  path?: string;
}): { reason: string; name?: string; path: string } {
  return {
    reason: input.reason,
    ...(input.name ? { name: truncate(String(input.name), 80) } : {}),
    path: normalizePathname(input.path ?? "/"),
  };
}

export function keepOriginalOnDuplicateEventId<T>(existing: T, incoming: T): T {
  void incoming;
  return existing;
}

function pickAttribution(raw: unknown): IngestAttribution {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const input = raw as Record<string, unknown>;
  const attribution: IngestAttribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = asNonEmptyString(input[key]);
    if (value) {
      attribution[key] = value;
    }
  }
  return attribution;
}

function cappedOptional(value: string | undefined, max: number): string | null {
  const trimmed = asNonEmptyString(value);
  if (!trimmed) return null;
  return truncate(trimmed, max);
}

export function buildFirstTouch(
  attribution: unknown,
  landingPath: string,
  shopHost?: string
): FirstTouchFields {
  const picked = pickAttribution(attribution);
  const referrer = asNonEmptyString(picked.referrer);
  const sanitizedReferrer = referrer ? sanitizeReferrer(referrer) : "";
  return {
    source: normalizeSource({ ...picked, shopHost }).source,
    medium: cappedOptional(picked.utm_medium, MAX_ANALYTICS_UTM_LENGTH),
    campaign: cappedOptional(picked.utm_campaign, MAX_ANALYTICS_CAMPAIGN_LENGTH),
    campaign_id: cappedOptional(picked.utm_id, MAX_ANALYTICS_UTM_LENGTH),
    campaign_content: cappedOptional(picked.utm_content, MAX_ANALYTICS_UTM_LENGTH),
    campaign_term: cappedOptional(picked.utm_term, MAX_ANALYTICS_UTM_LENGTH),
    ttclid: cappedOptional(picked.ttclid, MAX_ANALYTICS_CLICK_ID_LENGTH),
    fbclid: cappedOptional(picked.fbclid, MAX_ANALYTICS_CLICK_ID_LENGTH),
    gclid: cappedOptional(picked.gclid, MAX_ANALYTICS_CLICK_ID_LENGTH),
    referrer: sanitizedReferrer || null,
    landing_path: normalizePathname(landingPath),
  };
}

export function isAnalyticsUuid(value: string): boolean {
  return isUuid(value);
}

export function isUniqueViolation(code?: string): boolean {
  return code === "23505";
}

export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function bindProductRelations(input: {
  productId?: string;
  variantId?: string;
  productExists: boolean;
  variantProductId: string | null;
}): { product_id: string | null; variant_id: string | null } {
  const product_id = input.productId && input.productExists ? input.productId : null;

  if (input.productId && !product_id) {
    return { product_id: null, variant_id: null };
  }

  if (!input.variantId || !input.variantProductId) {
    return { product_id, variant_id: null };
  }

  if (product_id && input.variantProductId !== product_id) {
    return { product_id, variant_id: null };
  }

  return { product_id, variant_id: input.variantId };
}

export function rateLimitIdentity(input: {
  forwardedFor: string | null;
  sessionCookie: string | null;
}): { ip?: string; sid?: string } {
  const first = input.forwardedFor?.split(",")[0]?.trim();
  if (first) return { ip: first };
  const sid = asNonEmptyString(input.sessionCookie ?? undefined);
  if (sid) return { sid };
  return {};
}

export function deviceTypeFromUserAgent(
  ua: string | null | undefined
): "mobile" | "tablet" | "desktop" | "other" {
  const value = (ua ?? "").toLowerCase();
  if (!value) return "other";
  if (/ipad|tablet|playbook|silk/.test(value)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(value)) {
    return "mobile";
  }
  if (/mozilla|chrome|safari|firefox|edge|opera|msie|trident/.test(value)) {
    return "desktop";
  }
  return "other";
}
