import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { indexSiteUrl } from "@/lib/seo-rules";

/**
 * Resize first-party static files (/gadget/…, /categories/…) through Cloudinary
 * fetch so mobile grids do not download full-size PNG/WebP from origin.
 */
export function categoryImageUrl(
  path: string | undefined | null,
  w = 256,
): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return siteStaticImageUrl(trimmed, { w });
}

export function siteStaticImageUrl(
  path: string,
  { w = 640 }: { w?: number } = {},
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  /** Pre-built category cutouts — serve from origin (local + prod), no Cloudinary fetch. */
  if (normalized.startsWith("/categories/")) {
    return normalized;
  }
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    return normalized;
  }
  const live = indexSiteUrl().replace(/\/$/, "");
  if (/localhost|127\.0\.0\.1/i.test(live)) {
    return normalized;
  }
  const remote = `${live}${normalized}`;
  const insert = `f_webp,q_auto,c_limit,w_${w}/`;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${insert}${remote}`;
}
