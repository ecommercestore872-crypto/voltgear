declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    __META_PIXEL_LAST_PATHNAME__?: string;
    __META_PAGEVIEW_SEQUENCE__?: number;
    __META_VIEWCONTENT_LAST_KEY__?: string;
    __META_PIXEL_BOOTSTRAPPED__?: boolean;
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
