import { cloudinaryImageUrl } from "@/lib/cloudinary";
import type { StoreImage } from "@/lib/types";

export function storeImageRaw(
  source: StoreImage | null | undefined | unknown,
): string {
  if (!source) return "";
  if (typeof source === "string") return source.trim();
  if (typeof source !== "object") return "";
  const row = source as Record<string, unknown>;
  if (typeof row.url === "string" && row.url.trim()) return row.url.trim();
  if (typeof row.src === "string" && row.src.trim()) return row.src.trim();
  if (typeof row.image === "string" && row.image.trim()) return row.image.trim();
  const asset = row.asset;
  if (asset && typeof asset === "object") {
    const url = (asset as Record<string, unknown>).url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return "";
}

export function imageUrl(
  source: StoreImage | null | undefined | unknown,
  { w = 800 }: { w?: number; h?: number; quality?: number } = {}
): string {
  const raw = storeImageRaw(source);
  if (!raw) return "";
  const sourceStr = raw;
  if (
    sourceStr.includes("res.cloudinary.com") ||
    sourceStr.includes("/image/upload/")
  ) {
    return cloudinaryImageUrl(sourceStr, { w });
  }
  return sourceStr;
}
