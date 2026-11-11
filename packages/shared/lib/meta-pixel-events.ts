import { canSendMetaBrowserEvent } from "@/lib/meta-consent";
import { buildMetaHashedCustomer, type MetaCustomer } from "@/lib/meta-matching";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    __META_PIXEL_LAST_PATHNAME__?: string;
    __META_PAGEVIEW_SEQUENCE__?: number;
    __META_VIEWCONTENT_LAST_KEY__?: string;
    __META_PIXEL_BOOTSTRAPPED__?: boolean;
    __META_INITIATECHECKOUT_LAST_SEQUENCE__?: number;
    __META_PURCHASE_PENDING_ORDER_IDS__?: Set<string>;
    __META_PURCHASE_SENT_ORDER_IDS__?: Set<string>;
    __META_ADVANCED_MATCHING_KEY__?: string;
  }
}

export function newMetaEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // Fall through for older in-app browsers.
  }
  return `meta_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function sendMetaBrowserEvent(input: {
  eventName: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout";
  eventId: string;
  productIds?: string[];
  value?: number;
  numItems?: number;
}): void {
  if (!canSendMetaBrowserEvent()) return;
  try {
    void fetch("/api/meta/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ ...input, consent: "all", pageUrl: window.location.origin + window.location.pathname }),
    }).catch(() => {});
  } catch {
    // Browser events must not interrupt shopping.
  }
}

function initAdvancedMatching(customer?: MetaCustomer): void {
  if (!customer || !canSendMetaBrowserEvent() || !window.fbq) return;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return;
  const matching = buildMetaHashedCustomer(customer);
  if (!Object.keys(matching).length) return;
  const key = JSON.stringify(matching);
  if (window.__META_ADVANCED_MATCHING_KEY__ === key) return;
  window.fbq("init", pixelId, matching);
  window.__META_ADVANCED_MATCHING_KEY__ = key;
}

export function ensureMetaPageView(pathname: string): number | null {
  if (typeof window === "undefined") return null;
  if (!canSendMetaBrowserEvent()) return null;
  if (!window.fbq) return null;

  if (window.__META_PIXEL_LAST_PATHNAME__ === pathname) {
    return window.__META_PAGEVIEW_SEQUENCE__ || 1;
  }

  const eventId = newMetaEventId();
  window.fbq("track", "PageView", {}, { eventID: eventId });
  sendMetaBrowserEvent({ eventName: "PageView", eventId });
  window.__META_PIXEL_LAST_PATHNAME__ = pathname;
  window.__META_PAGEVIEW_SEQUENCE__ = (window.__META_PAGEVIEW_SEQUENCE__ || 0) + 1;
  
  return window.__META_PAGEVIEW_SEQUENCE__;
}

export function trackMetaViewContent({
  productId,
  name,
  price,
  category,
}: {
  productId?: string;
  name?: string;
  price?: number;
  category?: string;
}): void | (() => void) {
  if (typeof window === "undefined") return;
  if (!canSendMetaBrowserEvent()) return;
  if (!productId || !name || typeof price !== "number" || !isFinite(price)) return;

  const execute = () => {
    if (!window.fbq || !canSendMetaBrowserEvent()) return;

    const sequence =
      ensureMetaPageView(window.location.pathname) ||
      window.__META_PAGEVIEW_SEQUENCE__ ||
      1;
      
    const key = `${sequence}:${productId}`;
    if (window.__META_VIEWCONTENT_LAST_KEY__ === key) return;
    
    const eventId = newMetaEventId();
    window.fbq("track", "ViewContent", {
      content_ids: [productId],
      content_name: name,
      content_type: "product",
      value: price,
      currency: "PKR",
      ...(category ? { content_category: category } : {}),
    }, { eventID: eventId });
    sendMetaBrowserEvent({ eventName: "ViewContent", eventId, productIds: [productId], value: price });

    window.__META_VIEWCONTENT_LAST_KEY__ = key;
  };

  if (window.fbq) {
    execute();
    return;
  }

  const handler = () => {
    execute();
    window.removeEventListener("meta:pixel-ready", handler);
  };
  
  window.addEventListener("meta:pixel-ready", handler);
  
  return () => {
    window.removeEventListener("meta:pixel-ready", handler);
  };
}

export function trackMetaAddToCart({
  productId,
  name,
  price,
  quantity,
}: {
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
}): void {
  if (typeof window === "undefined") return;
  if (!canSendMetaBrowserEvent()) return;
  if (!productId || typeof name !== "string" || !name.trim()) return;
  if (typeof price !== "number" || !isFinite(price) || price < 0) return;
  if (typeof quantity !== "number" || !isFinite(quantity) || quantity <= 0) return;

  const execute = () => {
    if (!window.fbq || !canSendMetaBrowserEvent()) return;

    const eventId = newMetaEventId();
    window.fbq("track", "AddToCart", {
      content_ids: [productId],
      content_name: name,
      content_type: "product",
      contents: [
        {
          id: productId,
          quantity: quantity,
          item_price: price,
        },
      ],
      value: price * quantity,
      currency: "PKR",
    }, { eventID: eventId });
    sendMetaBrowserEvent({ eventName: "AddToCart", eventId, productIds: [productId], value: price * quantity, numItems: quantity });
  };

  if (window.fbq) {
    execute();
    return;
  }

  window.addEventListener("meta:pixel-ready", execute, { once: true });
}

export function trackMetaInitiateCheckout({
  items,
  value,
}: {
  items: Array<{
    productId?: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
  value: number;
}): void | (() => void) {
  if (typeof window === "undefined") return;
  if (!canSendMetaBrowserEvent()) return;
  if (!items.length) return;
  if (typeof value !== "number" || !isFinite(value) || value < 0) return;

  const summedQuantity = items.reduce((acc, item) => {
    if (typeof item.quantity === "number" && isFinite(item.quantity) && item.quantity > 0) {
      return acc + item.quantity;
    }
    return acc;
  }, 0);

  if (summedQuantity <= 0) return;

  const execute = () => {
    if (!window.fbq || !canSendMetaBrowserEvent()) return;

    const sequence =
      ensureMetaPageView(window.location.pathname) ||
      window.__META_PAGEVIEW_SEQUENCE__;
      
    if (!sequence) return;
    
    if (window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ === sequence) return;

    const allItemsValid = items.every((i) => {
      if (!i.productId || i.productId.trim() === "") return false;
      if (typeof i.price !== "number" || !isFinite(i.price) || i.price < 0) return false;
      if (typeof i.quantity !== "number" || !isFinite(i.quantity) || i.quantity <= 0) return false;
      return true;
    });

    const eventId = newMetaEventId();
    if (allItemsValid) {
      window.fbq("track", "InitiateCheckout", {
        content_ids: items.map((i) => i.productId as string),
        content_type: "product",
        contents: items.map((i) => ({
          id: i.productId as string,
          quantity: i.quantity,
          item_price: i.price,
        })),
        num_items: summedQuantity,
        value: value,
        currency: "PKR",
      }, { eventID: eventId });
    } else {
      window.fbq("track", "InitiateCheckout", {
        num_items: summedQuantity,
        value: value,
        currency: "PKR",
      }, { eventID: eventId });
    }
    sendMetaBrowserEvent({ eventName: "InitiateCheckout", eventId,
      ...(allItemsValid ? { productIds: items.map((i) => i.productId as string) } : {}),
      value, numItems: summedQuantity });

    window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ = sequence;
  };

  if (window.fbq) {
    execute();
    return;
  }

  const handler = () => {
    execute();
    window.removeEventListener("meta:pixel-ready", handler);
  };
  
  window.addEventListener("meta:pixel-ready", handler, { once: true });
  
  return () => {
    window.removeEventListener("meta:pixel-ready", handler);
  };
}

export function trackMetaPurchase({
  orderId,
  items,
  value,
  customer,
}: {
  orderId: string;
  items: Array<{
    productId?: string;
    name?: string;
    price: number;
    quantity: number;
  }>;
  value: number;
  customer?: MetaCustomer;
}): void {
  if (typeof window === "undefined") return;
  if (!canSendMetaBrowserEvent()) return;
  if (typeof orderId !== "string" || orderId.trim().length === 0) return;
  if (typeof value !== "number" || !isFinite(value) || value < 0) return;

  const validOrderId = orderId.trim();

  window.__META_PURCHASE_PENDING_ORDER_IDS__ = window.__META_PURCHASE_PENDING_ORDER_IDS__ || new Set();
  window.__META_PURCHASE_SENT_ORDER_IDS__ = window.__META_PURCHASE_SENT_ORDER_IDS__ || new Set();
  
  const SS_KEY = "buy-n-try-meta-purchase-sent";
  
  const getSentOrders = (): Set<string> => {
    try {
      const stored = window.sessionStorage.getItem(SS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // fail-open
    }
    return new Set();
  };
  
  const saveSentOrder = (id: string) => {
    try {
      const sent = getSentOrders();
      sent.add(id);
      window.sessionStorage.setItem(SS_KEY, JSON.stringify(Array.from(sent)));
    } catch {
      // fail-open
    }
  };

  if (window.__META_PURCHASE_SENT_ORDER_IDS__.has(validOrderId)) return;
  if (window.__META_PURCHASE_PENDING_ORDER_IDS__.has(validOrderId)) return;
  
  const sessionSent = getSentOrders();
  if (sessionSent.has(validOrderId)) return;

  const summedQuantity = items.reduce((acc, item) => {
    if (typeof item.quantity === "number" && isFinite(item.quantity) && item.quantity > 0) {
      return acc + item.quantity;
    }
    return acc;
  }, 0);

  if (summedQuantity <= 0) return;

  window.__META_PURCHASE_PENDING_ORDER_IDS__.add(validOrderId);

  const execute = () => {
    if (!window.fbq || !canSendMetaBrowserEvent()) return;
    initAdvancedMatching({ ...customer, externalId: validOrderId });

    const allItemsValid = items.every((i) => {
      if (!i.productId || i.productId.trim() === "") return false;
      if (typeof i.price !== "number" || !isFinite(i.price) || i.price < 0) return false;
      if (typeof i.quantity !== "number" || !isFinite(i.quantity) || i.quantity <= 0) return false;
      return true;
    });

    if (allItemsValid) {
      window.fbq(
        "track",
        "Purchase",
        {
          content_ids: items.map((i) => i.productId as string),
          content_type: "product",
          contents: items.map((i) => ({
            id: i.productId as string,
            quantity: i.quantity,
            item_price: i.price,
          })),
          num_items: summedQuantity,
          value: value,
          currency: "PKR",
        },
        {
          eventID: validOrderId,
        }
      );
    } else {
      window.fbq(
        "track",
        "Purchase",
        {
          num_items: summedQuantity,
          value: value,
          currency: "PKR",
        },
        {
          eventID: validOrderId,
        }
      );
    }
    
    window.__META_PURCHASE_PENDING_ORDER_IDS__?.delete(validOrderId);
    window.__META_PURCHASE_SENT_ORDER_IDS__?.add(validOrderId);
    saveSentOrder(validOrderId);
  };

  if (window.fbq) {
    execute();
    return;
  }

  const handler = () => {
    execute();
  };
  
  window.addEventListener("meta:pixel-ready", handler, { once: true });
}
