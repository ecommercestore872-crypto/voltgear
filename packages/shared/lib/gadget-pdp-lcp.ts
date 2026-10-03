import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";

/** Mobile-first LCP URL for PDP (matches ~50vw gallery, quality 75). */
export function pdpLcpImageUrl(
  product: Pick<Product, "images" | "cloudinaryImages" | "slug" | "category">,
): string | null {
  return gadgetImageSrc(product, PRODUCT_IMAGE.pdpLcp) || null;
}

export function pdpProductCacheTag(slug: string): string {
  return `pdp-product-${slug.trim()}`;
}
