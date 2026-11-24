import { pipVideoForProduct } from "@/lib/product-pip-video";

/** Phone-friendly delivery for Cloudinary-hosted clips (Reels are often 1080x1920). */
const CLOUDINARY_VIDEO_TRANSFORM = "q_auto,w_720,c_limit";

export type GalleryVideo = {
  /** "file" plays inline; instagram/tiktok are embeds that load only after a tap. */
  kind: "file" | "instagram" | "tiktok";
  src: string;
  poster?: string;
  /** Link to the original post (embeds only). */
  openHref?: string;
};

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

/** The product video for the PDP gallery: an uploaded MP4, else an Instagram/TikTok link. */
export function galleryVideoForProduct(product: Parameters<typeof pipVideoForProduct>[0]): GalleryVideo | null {
  const pip = pipVideoForProduct(product);
  if (!pip) return null;
  if (pip.kind === "file") {
    return { kind: "file", src: optimizeCloudinaryVideoUrl(pip.playSrc), poster: pip.poster };
  }
  return { kind: pip.kind, src: pip.playSrc, poster: pip.poster, openHref: pip.openHref };
}
