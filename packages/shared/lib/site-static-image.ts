import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { indexSiteUrl } from "@/lib/seo-rules";

/**
 * Resize first-party static files (/gadget/…, /categories/…) through Cloudinary
 * fetch so mobile grids do not download full-size PNG/WebP from origin.
 */
export function siteStaticImageUrl(
  path: string,
  { w = 640 }: { w?: number } = {},
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
    return normalized;
  }
  const origin = indexSiteUrl().replace(/\/$/, "");
  return cloudinaryImageUrl(`${origin}${normalized}`, { w, q: "auto" });
}
