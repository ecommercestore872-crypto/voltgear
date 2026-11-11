import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { gadgetStudioImagesFor } from "@/lib/gadget-product-images";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";

/** Mobile-first LCP URL for PDP (optimized 640w, quality 70 for instant mobile paint). */
export function pdpLcpImageUrl(
  product: Pick<Product, "images" | "cloudinaryImages" | "slug" | "category">,
): string | null {
  const studio = gadgetStudioImagesFor(product.slug, product.category);
  const raw =
    studio?.[0] ||
    product.cloudinaryImages?.[0] ||
    (product.images?.[0] ? imageUrl(product.images[0], { w: 640 }) : null);
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return cloudinaryImageUrl(raw, { w: 640, q: "70" });
}

export function pdpProductCacheTag(slug: string): string {
  return `pdp-product-${slug.trim()}`;
}
