export function isGadgetPreviewPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/home2" ||
    pathname.startsWith("/home2/") ||
    pathname === "/product" ||
    pathname.startsWith("/product/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/product2" ||
    pathname.startsWith("/product2/") ||
    pathname === "/products2" ||
    pathname.startsWith("/products2/") ||
    pathname === "/collections" ||
    pathname.startsWith("/collections/")
  );
}

export const GADGET_SESSION_KEY = "vg-gadget-preview";

/** Checkout entry that keeps cream/forest chrome after leaving /product2. */
export function checkoutHref(fromGadget: boolean): string {
  return fromGadget ? "/checkout?from=gadget" : "/checkout";
}

export function isCheckoutPath(pathname: string): boolean {
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

/**
 * Shared storefront routes that keep cream/forest chrome while a preview
 * session is active (nav links from gadget chrome: cart, search, support).
 */
export function isGadgetContinuityPath(pathname: string): boolean {
  return (
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/order" ||
    pathname.startsWith("/order/") ||
    pathname === "/search" ||
    pathname.startsWith("/search/") ||
    pathname === "/compare" ||
    pathname.startsWith("/compare/") ||
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname === "/warranty" ||
    pathname.startsWith("/warranty/") ||
    pathname === "/blog" ||
    pathname.startsWith("/blog/") ||
    pathname === "/bulk-order" ||
    pathname.startsWith("/bulk-order/") ||
    pathname === "/contact" ||
    pathname.startsWith("/contact/") ||
    pathname === "/faq" ||
    pathname.startsWith("/faq/") ||
    pathname === "/shipping-returns" ||
    pathname.startsWith("/shipping-returns/") ||
    pathname === "/privacy-policy" ||
    pathname.startsWith("/privacy-policy/") ||
    pathname === "/terms-of-service" ||
    pathname.startsWith("/terms-of-service/") ||
    pathname === "/about" ||
    pathname.startsWith("/about/")
  );
}

/**
 * Client chrome helper: preview routes always; checkout / continuity routes
 * when `?from=gadget` or an active preview session (set on /home2|/product2|/products2).
 */
export function shouldUseGadgetChrome(
  pathname: string,
  opts?: { search?: string; sessionActive?: boolean }
): boolean {
  if (isGadgetPreviewPath(pathname)) return true;
  const params = new URLSearchParams(opts?.search ?? "");
  const fromGadget = params.get("from") === "gadget";
  const session = Boolean(opts?.sessionActive) || fromGadget;
  if (isCheckoutPath(pathname)) {
    if (fromGadget) return true;
    return Boolean(opts?.sessionActive);
  }
  if (isGadgetContinuityPath(pathname)) return session;
  return false;
}

export function syncGadgetPreviewSession(pathname: string, search = ""): void {
  if (typeof window === "undefined") return;
  try {
    if (isGadgetPreviewPath(pathname)) {
      sessionStorage.setItem(GADGET_SESSION_KEY, "1");
      return;
    }
    if (isCheckoutPath(pathname) && new URLSearchParams(search).get("from") === "gadget") {
      sessionStorage.setItem(GADGET_SESSION_KEY, "1");
      return;
    }
    const liveProduct = pathname.startsWith("/product/") && !pathname.startsWith("/product2");
    const liveCatalog =
      pathname === "/products" ||
      (pathname.startsWith("/products/") && !pathname.startsWith("/products2"));
    if (liveProduct || liveCatalog) {
      sessionStorage.removeItem(GADGET_SESSION_KEY);
    }
  } catch {
    /* private mode / blocked storage */
  }
}

export function readGadgetPreviewSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(GADGET_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function product2Href(slug: string): string {
  return `/product/${slug}`;
}

export function products2Href(categorySlug?: string): string {
  if (categorySlug) return `/products/${categorySlug}`;
  return "/products";
}

export function collectionHref(slug: string): string {
  return `/collections/${slug}`;
}

export function gadgetShopTypeLinks(
  types: { name: string; slug: string; imageUrl?: string }[]
): { label: string; href: string; imageUrl?: string }[] {
  return types.map((t) => ({ label: t.name, href: products2Href(t.slug), imageUrl: t.imageUrl }));
}

export type GadgetVideoKind = "none" | "file" | "instagram" | "tiktok";

export function videoKind(
  url?: string | null,
  cloudinaryPublicId?: string | null
): GadgetVideoKind {
  if (cloudinaryPublicId?.trim()) return "file";
  const raw = url?.trim() ?? "";
  if (!raw) return "none";
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  } catch {
    return "none";
  }
  if (/^https?:\/\//i.test(raw)) return "file";
  return "none";
}

export function videoEmbedSrc(kind: GadgetVideoKind, url: string): string | null {
  if (kind !== "instagram" && kind !== "tiktok") return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const path = parsed.pathname.replace(/\/$/, "");
  if (kind === "instagram") {
    return `${parsed.origin}${path}/embed`;
  }
  return `https://www.tiktok.com/embed${path}`;
}

export function hasShopperProductVideo(product: {
  productVideo?: { url?: string | null; cloudinaryPublicId?: string | null } | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
}): boolean {
  return (
    videoKind(product.productVideo?.url, product.productVideo?.cloudinaryPublicId) !== "none" ||
    videoKind(product.instagramUrl) !== "none" ||
    videoKind(product.tiktokUrl) !== "none"
  );
}
