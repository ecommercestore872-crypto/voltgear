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
}

export function ensureMetaPageView(pathname: string): number | null {
  if (typeof window === "undefined") return null;
  if (!window.fbq) return null;

  if (window.__META_PIXEL_LAST_PATHNAME__ === pathname) {
    return window.__META_PAGEVIEW_SEQUENCE__ || 1;
  }

  window.fbq("track", "PageView");
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
  if (!productId || !name || typeof price !== "number" || !isFinite(price)) return;

  const execute = () => {
    if (!window.fbq) return;

    const sequence =
      ensureMetaPageView(window.location.pathname) ||
      window.__META_PAGEVIEW_SEQUENCE__ ||
      1;
      
    const key = `${sequence}:${productId}`;
    if (window.__META_VIEWCONTENT_LAST_KEY__ === key) return;
    
    window.fbq("track", "ViewContent", {
      content_ids: [productId],
      content_name: name,
      content_type: "product",
      value: price,
      currency: "PKR",
      ...(category ? { content_category: category } : {}),
    });

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
  if (!productId || typeof name !== "string" || !name.trim()) return;
  if (typeof price !== "number" || !isFinite(price) || price < 0) return;
  if (typeof quantity !== "number" || !isFinite(quantity) || quantity <= 0) return;

  const execute = () => {
    if (!window.fbq) return;

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
    });
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
    if (!window.fbq) return;

    const sequence =
      ensureMetaPageView(window.location.pathname) ||
      window.__META_PAGEVIEW_SEQUENCE__;
      
    if (!sequence) return;
    
    if (window.__META_INITIATECHECKOUT_LAST_SEQUENCE__ === sequence) return;

    const allHaveId = items.every((i) => i.productId && i.productId.trim() !== "");

    if (allHaveId) {
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
      });
    } else {
      window.fbq("track", "InitiateCheckout", {
        num_items: summedQuantity,
        value: value,
        currency: "PKR",
      });
    }

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
