/** Square size Shopify uses. Looks sharp on phones and computers. */
export const PRODUCT_IMAGE = {
  uploadWidth: 2048,
  uploadHeight: 2048,
  minEdge: 800,
  gallery: 2000,
  card: 900,
  thumb: 320,
} as const;

export const PRODUCT_PHOTO_HINT =
  "Format: JPG, WEBP, or PNG. Use a square photo, 2048 × 2048 pixels (1:1 ratio). That stays sharp and does not stretch. Crop phone photos to a square first. Avoid tiny screenshots.";

export function isProductImageTooSmall(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return Math.min(width, height) < PRODUCT_IMAGE.minEdge;
}
