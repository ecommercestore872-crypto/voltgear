import { pipVideoForProduct } from "@/lib/product-pip-video";

/** Phone-friendly delivery for Cloudinary-hosted clips (Reels are often 1080x1920). */
const CLOUDINARY_VIDEO_TRANSFORM = "q_auto,w_720,c_limit";

export type GalleryVideo = { src: string; poster?: string };

/**
 * Add a size/quality transform to a plain Cloudinary video URL.
 * URLs that already carry a transform, and non-Cloudinary URLs, are returned unchanged.
 */
export function optimizeCloudinaryVideoUrl(url: string): string {
  const marker = "/video/upload/";
  if (!url.startsWith("https://res.cloudinary.com/")) return url;
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const tail = url.slice(idx + marker.length);
  // A transform segment looks like "q_auto,w_720"; a version is "v123"; an id has no "_x," pairs.
  const first = tail.split("/")[0] ?? "";
  if (/^[a-z]{1,3}_[^/]+/.test(first) && first.includes("_") && !/^v\d+$/.test(first)) {
    return url;
  }
  return `${url.slice(0, idx + marker.length)}${CLOUDINARY_VIDEO_TRANSFORM}/${tail}`;
}

/** The admin-uploaded MP4 for the PDP gallery. Returns null for missing or social-only video. */
export function galleryVideoForProduct(product: Parameters<typeof pipVideoForProduct>[0]): GalleryVideo | null {
  const pip = pipVideoForProduct(product);
  if (!pip || pip.kind !== "file") return null;
  return { src: optimizeCloudinaryVideoUrl(pip.playSrc), poster: pip.poster };
}
