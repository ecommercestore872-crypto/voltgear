import { cloudinaryImageUrl } from "@/lib/cloudinary";

/** Square size Shopify uses. Looks sharp on phones and computers. */
export const PRODUCT_IMAGE = {
  uploadWidth: 2048,
  uploadHeight: 2048,
  minEdge: 800,
  /** PDP main — matches Next deviceSizes max for 50vw layout */
  gallery: 1200,
  /** PDP LCP preload — tuned for iPhone viewport width (~390–430px @2x) */
  pdpLcp: 640,
  /** PDP main image on phones (100vw gallery column) */
  pdpMobileMain: 828,
  /** PLP / grids — ~25–50vw on typical viewports */
  card: 640,
  /** Hero / full-bleed banners */
  hero: 1200,
  thumb: 256,
} as const;

export const PRODUCT_PHOTO_HINT =
  "Format: JPG, WEBP, or PNG. Use a square photo, 2048 × 2048 pixels (1:1 ratio). That stays sharp and does not stretch. Crop phone photos to a square first. Avoid tiny screenshots.";

export function isProductImageTooSmall(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return Math.min(width, height) < PRODUCT_IMAGE.minEdge;
}

/** Grid / product card: square canvas, no crop — Cloudinary pads non-square uploads. */
export function productCardImageUrl(src: string | null | undefined): string {
  const s = src?.trim();
  if (!s) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (
    s.includes("res.cloudinary.com") ||
    s.includes("/image/upload/") ||
    (!s.startsWith("http") && s.length > 0)
  ) {
    return cloudinaryImageUrl(s, { w: PRODUCT_IMAGE.card, fit: "pad" });
  }
  return s;
}
