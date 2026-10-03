import type { Product } from "@/lib/types";

/** Fields needed for buy box + gallery — keeps client RSC payload small. */
export type PdpClientProduct = Pick<
  Product,
  | "_id"
  | "name"
  | "slug"
  | "category"
  | "price"
  | "compareAtPrice"
  | "images"
  | "cloudinaryImages"
  | "shortDescription"
  | "sku"
  | "brand"
  | "stockStatus"
  | "quantity"
  | "rating"
  | "reviewCount"
  | "featured"
  | "badge"
  | "variants"
  | "colorEnabled"
  | "sizeEnabled"
  | "colorOptions"
  | "sizeOptions"
  | "freeShipping"
  | "instagramUrl"
  | "tiktokUrl"
>;

export function stripProductForPdpClient(product: Product): PdpClientProduct {
  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images,
    cloudinaryImages: product.cloudinaryImages,
    shortDescription: product.shortDescription,
    sku: product.sku,
    brand: product.brand,
    stockStatus: product.stockStatus,
    quantity: product.quantity,
    rating: product.rating,
    reviewCount: product.reviewCount,
    featured: product.featured,
    badge: product.badge,
    variants: product.variants,
    colorEnabled: product.colorEnabled,
    sizeEnabled: product.sizeEnabled,
    colorOptions: product.colorOptions,
    sizeOptions: product.sizeOptions,
    freeShipping: product.freeShipping,
    instagramUrl: product.instagramUrl,
    tiktokUrl: product.tiktokUrl,
  };
}
