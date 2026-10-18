import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { gadgetStudioImagesFor } from "@/lib/gadget-product-images";
import { imageUrl } from "@/lib/sanity/image";
import { PRODUCT_IMAGE, productCardImageUrl } from "@/lib/product-image";
import { siteStaticImageUrl } from "@/lib/site-static-image";
import type { Product } from "@/lib/types";

/** Resolve a shopper-facing product image without introducing a UI dependency. */
export function gadgetImageSrc(
  product: Pick<Product, "images" | "cloudinaryImages" | "slug" | "category">,
  w: number,
): string | null {
  const studio = gadgetStudioImagesFor(product.slug, product.category);
  if (studio?.[0]) {
    const source = studio[0];
    if (source.startsWith("/")) return siteStaticImageUrl(source, { w });
    return source;
  }

  if (product.images?.[0]) {
    const source =
      w === PRODUCT_IMAGE.card
        ? productCardImageUrl(product.images[0])
        : imageUrl(product.images[0], { w });
    return source || null;
  }
  if (product.cloudinaryImages?.[0]) {
    const source =
      w === PRODUCT_IMAGE.card
        ? productCardImageUrl(product.cloudinaryImages[0])
        : cloudinaryImageUrl(product.cloudinaryImages[0], { w });
    return source || null;
  }
  return null;
}
