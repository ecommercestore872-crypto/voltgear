import { sanitizeReferrer } from "./db/analytics-ingest-rules";

const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_content",
  "utm_term",
  "ttclid",
  "fbclid",
  "gclid",
] as const;

export type LandingAttribution = {
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

export type FirstPartyTrackEvent = {
  name: string;
  path: string;
  page_type: string;
  product_id?: string;
  variant_id?: string;
  product_slug?: string;
  properties?: Record<string, unknown>;
};

type FirstPartyClient = { track: (event: FirstPartyTrackEvent) => Promise<void> };

const FIELD_VALIDATION_CATEGORIES = new Set([
  "name",
  "email",
  "phone",
  "address",
  "city",
]);

type FetchFn = typeof fetch;

export function shouldCollectPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return false;
  }
  // Legacy preview-only home; live Biometic is `/` + `/products2` + `/product2`.
  if (pathname === "/home2" || pathname.startsWith("/home2/")) {
    return false;
  }
  return true;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname || "/";
}

export function pageTypeFromPath(pathname: string): string {
  const path = normalizePathname(pathname);
  if (path === "/") return "home";
  if (
    path === "/products2" ||
    path.startsWith("/products2/") ||
    path === "/products" ||
    path.startsWith("/products/")
  ) {
    return "catalog";
  }
  if (
    path === "/product2" ||
    path.startsWith("/product2/") ||
    path === "/product" ||
    path.startsWith("/product/")
  ) {
    return "product";
  }
  if (path === "/cart" || path.startsWith("/cart/")) return "cart";
  if (path === "/checkout" || path.startsWith("/checkout/")) return "checkout";
  if (path === "/search" || path.startsWith("/search/")) return "search";
  if (path === "/blog" || path.startsWith("/blog/") || path === "/warranty") return "content";
  return "other";
}

export function validationCategoryFromFieldName(name: string): string {
  if (FIELD_VALIDATION_CATEGORIES.has(name)) return name;
  return "other";
}

export function checkoutValidationCategoryFromHttp(
  status: number,
  error?: string,
): "price_changed" | "empty_cart" | "stock" | "other" | null {
  if (status === 409) return "price_changed";
  if (status !== 400) return null;
  const message = (error ?? "").toLowerCase();
  if (message.includes("empty")) return "empty_cart";
  if (
    message.includes("sold out") ||
    message.includes("no longer available") ||
    message.includes("stock")
  ) {
    return "stock";
  }
  return "other";
}

export function captureLandingAttribution(
  href: string,
  referrer: string,
): LandingAttribution {
  const attribution: LandingAttribution = {};

  try {
    const url = new URL(href);
    for (const param of ATTRIBUTION_PARAMS) {
      const value = url.searchParams.get(param);
      if (value) {
        attribution[param] = value;
      }
    }
  } catch {
    // ignore malformed href
  }

  const sanitized = sanitizeReferrer(referrer);
  if (sanitized) {
    attribution.referrer = sanitized;
  }

  return attribution;
}

export function createFirstPartyClient({
  fetch,
  getHref,
  getReferrer,
  newEventId = () => crypto.randomUUID(),
}: {
  fetch: FetchFn;
  getHref: () => string;
  getReferrer: () => string;
  newEventId?: () => string;
}) {
  const attribution = captureLandingAttribution(getHref(), getReferrer());
  let chain: Promise<void> = Promise.resolve();
  let isFirstSend = true;

  async function sendEvent(
    event: FirstPartyTrackEvent,
    eventId: string,
    includeAttribution: boolean,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      event_id: eventId,
      name: event.name,
      path: event.path,
      page_type: event.page_type,
    };

    if (event.product_id) {
      body.product_id = event.product_id;
    }
    if (event.variant_id) {
      body.variant_id = event.variant_id;
    }
    if (event.product_slug) {
      body.product_slug = event.product_slug;
    }
    if (event.properties) {
      body.properties = event.properties;
    }

    if (includeAttribution) {
      body.attribution = attribution;
    }

    await fetch("/api/analytics/event", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function track(event: FirstPartyTrackEvent): Promise<void> {
    const eventId = newEventId();

    return new Promise<void>((resolve) => {
      chain = chain
        .then(async () => {
          const includeAttribution = isFirstSend;
          try {
            await sendEvent(event, eventId, includeAttribution);
            if (includeAttribution) {
              isFirstSend = false;
            }
          } catch {
            // fail-open: swallow fetch errors
          } finally {
            resolve();
          }
        })
        .catch(() => {
          resolve();
        });
    });
  }

  return { track };
}

const noopClient: FirstPartyClient = {
  track: () => Promise.resolve(),
};

let browserClient: FirstPartyClient | null = null;

export function getBrowserAnalyticsClient(): FirstPartyClient {
  if (typeof window === "undefined") {
    return noopClient;
  }
  if (!browserClient) {
    browserClient = createFirstPartyClient({
      fetch: window.fetch.bind(window),
      getHref: () => window.location.href,
      getReferrer: () => document.referrer,
    });
  }
  return browserClient;
}

export function trackFirstParty(event: FirstPartyTrackEvent): void {
  try {
    if (typeof window !== "undefined" && !shouldCollectPath(window.location.pathname)) {
      return;
    }
    void getBrowserAnalyticsClient().track(event);
  } catch {
    // fail-open
  }
}
