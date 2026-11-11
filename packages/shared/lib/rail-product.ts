import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";

const EMPTY_ARRAY: never[] = [];

export function toRailProduct(prod: Product): Product {
  return {
    _id: prod._id,
    name: prod.name,
    slug: prod.slug,
    price: prod.price,
    compareAtPrice: prod.compareAtPrice,
    stockStatus: prod.stockStatus,
    badge: prod.badge,
    reviewCount: prod.reviewCount,
    rating: prod.rating,
    images: prod.images?.length ? [prod.images[0]!] : EMPTY_ARRAY,
    cloudinaryImages: prod.cloudinaryImages?.length
      ? [prod.cloudinaryImages[0]!]
      : EMPTY_ARRAY,
    category: prod.category,
    sku: prod.sku,
    freeShipping: prod.freeShipping,
    featured: prod.featured,
    description: EMPTY_ARRAY,
    specifications: EMPTY_ARRAY,
    features: EMPTY_ARRAY,
    inTheBox: EMPTY_ARRAY,
    compatibility: EMPTY_ARRAY,
    reviews: EMPTY_ARRAY,
    variants: EMPTY_ARRAY,
  };
}

export function sortCatalogProducts(list: Product[], sort: string): Product[] {
  const sorted = [...list].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return (
      Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)
    );
  });
  return [
    ...sorted.filter((p) => !getStockState(p.stockStatus).soldOut),
    ...sorted.filter((p) => getStockState(p.stockStatus).soldOut),
  ];
}
