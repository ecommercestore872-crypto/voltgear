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

/**
 * Returns an auto-optimized Cloudinary image URL (f_auto, q_auto,
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

  const insert = `f_auto,q_${q},c_limit,w_${w}/`;
  const endPath = base.slice(idx + marker.length).replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return `${base.slice(0, idx + marker.length)}${insert}${endPath}`;
}

import type { ImageLoaderProps } from "next/image";

/**
 * Custom Next.js Image loader that forces Cloudinary to do the resizing,
 * completely bypassing Vercel Serverless Function latency!
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  if (!src.includes("res.cloudinary.com")) return src;
  
  // If the src ALREADY contains transformations (e.g. from cloudinaryImageUrl),
  // we just return it as is, or strip them out to apply the active Next.js width.
  // Actually, to keep it simple, if it has /upload/ with f_auto already:
  if (src.includes("/upload/f_auto")) {
    return src; 
  }

  const marker = "/image/upload/";
  const idx = src.indexOf(marker);
  if (idx === -1) return src;

  const q = quality || "auto";
  const endPath = src.slice(idx + marker.length).replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
  return `${src.slice(0, idx + marker.length)}f_auto,q_${q},c_limit,w_${width}/${endPath}`;
}
