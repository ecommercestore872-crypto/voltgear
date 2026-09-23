import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { gadgetStudioImagesFor } from "@/lib/gadget-product-images";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";

export function gadgetImageSrc(
  product: Pick<Product, "images" | "cloudinaryImages" | "slug" | "category">,
  w: number,
): string | null {
  const studio = gadgetStudioImagesFor(product.slug, product.category);
  if (studio?.[0]) return studio[0];

  if (product.images?.[0]) {
    const src = imageUrl(product.images[0], { w });
    return src || null;
  }
  if (product.cloudinaryImages?.[0]) {
    const src = cloudinaryImageUrl(product.cloudinaryImages[0], { w });
    return src || null;
  }
  return null;
}
