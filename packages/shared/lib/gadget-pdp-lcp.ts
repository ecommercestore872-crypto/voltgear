import { gadgetImageSrc } from "@/lib/gadget-image";
import { galleryVideoForProduct } from "@/lib/product-gallery-video";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";

/** Mobile-first LCP URL for PDP (matches ~50vw gallery, quality 75). */
export function pdpLcpImageUrl(
  product: Pick<Product, "images" | "cloudinaryImages" | "slug" | "category">,
): string | null {
  return gadgetImageSrc(product, PRODUCT_IMAGE.pdpLcp) || null;
}

/**
 * Shared by the server hero and the gallery so both pick the same srcset file.
 * Phones show the image ~90% wide, but ~65vw keeps a 3x phone on the 828px file
 * (not 1200px): 4G-friendly and still sharp for a white-background product shot.
 */
export const PDP_HERO_SIZES = "(max-width: 767px) 65vw, 45vw";

/** Thumbnail count the interactive gallery will render, so the hero can reserve the same height. */
export function pdpGalleryThumbCount(
  product: Product,
): number {
  const n =
    (product.images?.length ?? 0) +
    (product.cloudinaryImages?.length ?? 0) +
    (galleryVideoForProduct(product) ? 1 : 0);
  return n > 1 ? n : 0;
}

export function pdpProductCacheTag(slug: string): string {
  return `pdp-product-${slug.trim()}`;
}
