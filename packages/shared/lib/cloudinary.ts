export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
export const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const CLOUDINARY_FOLDER = "ecommerce-store/products";

export const CLOUDINARY_TRANSFORM = {
  background_removal: "cloudinary_ai" as const,
  quality: "auto" as const,
  fetch_format: "auto" as const,
};

/** Strip version + transform segments so we never stack w_/f_ twice. */
export function cloudinaryAssetPathAfterUpload(uploadTail: string): string {
  let rest = uploadTail.replace(/^\/+/, "");
  if (/^v\d+\//.test(rest)) {
    rest = rest.slice(rest.indexOf("/") + 1);
  }
  while (rest.length > 0) {
    const slash = rest.indexOf("/");
    const segment = slash === -1 ? rest : rest.slice(0, slash);
    const looksLikeTransform =
      segment.includes("_") &&
      /^(f_|q_|c_|w_|h_|g_|e_|fl_|b_|dpr_|ar_)/.test(segment);
    if (!looksLikeTransform) break;
    rest = slash === -1 ? "" : rest.slice(slash + 1);
  }
  return rest
    .replace(/\.heic$/i, ".webp")
    .replace(/\.heif$/i, ".webp")
    .replace(/\.jpg$/i, ".webp")
    .replace(/\.jpeg$/i, ".webp")
    .replace(/\.png$/i, ".webp");
}

/**
 * Returns an auto-optimized Cloudinary image URL (f_webp, q_auto,
 * responsive width). Accepts either a full URL or a bare public ID.
 */
export function cloudinaryImageUrl(
  src: string | undefined | null,
  { w = 800, q = "auto" }: { w?: number; q?: string } = {}
): string {
  if (!src) return "";
  let base = src.trim();
  if (base.startsWith("/") && !base.startsWith("//")) return base;

  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME;

  if (!base.startsWith("http")) {
    if (!cloudName) return base;
    base = `https://res.cloudinary.com/${cloudName}/image/upload/${base}`;
  }

  const marker = "/image/upload/";
  const idx = base.indexOf(marker);
  if (idx === -1) return base;

  const insert = `f_webp,q_${q},c_limit,w_${w}/`;
  const endPath = cloudinaryAssetPathAfterUpload(base.slice(idx + marker.length));
  return `${base.slice(0, idx + marker.length)}${insert}${endPath}`;
}

import type { ImageLoaderProps } from "next/image";

import { indexSiteUrl } from "@/lib/seo-rules";

/**
 * Custom Next.js Image loader that forces Cloudinary to do the resizing,
 * completely bypassing Vercel Serverless Function latency!
 */
/** Next.js `loader` — resize on Cloudinary, not Vercel Image Optimization. */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  const q = quality ? String(quality) : "auto";
  if (src.includes("res.cloudinary.com")) {
    return cloudinaryImageUrl(src, { w: width, q });
  }
  if (src.startsWith("/") && !src.startsWith("//")) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      const origin = indexSiteUrl().replace(/\/$/, "");
      const remote = `${origin}${src}`;
      const insert = `f_webp,q_${q},c_limit,w_${width}/`;
      return `https://res.cloudinary.com/${cloudName}/image/upload/${insert}${remote}`;
    }
  }
  return src;
}

export default cloudinaryLoader;
