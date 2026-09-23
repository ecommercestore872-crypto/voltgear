import { cloudinaryImageUrl } from "@/lib/cloudinary";
import type { StoreImage } from "@/lib/types";

export function imageUrl(
  source: StoreImage | null | undefined | unknown,
  { w = 800 }: { w?: number; h?: number; quality?: number } = {}
): string {
  if (!source) return "";
  if (typeof source !== "string") return "";
  if (
    source.includes("res.cloudinary.com") ||
    source.includes("/image/upload/")
  ) {
    return cloudinaryImageUrl(source, { w });
  }
  return source;
}
