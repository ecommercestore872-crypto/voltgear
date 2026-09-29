import type { Product } from "@/lib/types";

export function activeCategorySlugSet(
  types: { slug: string }[],
): Set<string> {
  return new Set(types.map((t) => t.slug).filter(Boolean));
}

/** Hide products whose category is inactive (not in storefront shop-type list). */
export function filterProductsToActiveCategories(
  products: Product[],
  activeSlugs: Set<string>,
): Product[] {
  if (activeSlugs.size === 0) return products;
  return products.filter((p) => activeSlugs.has(p.category));
}

export function slugSetFromShopTypeLinks(
  links: { slug?: string; href: string }[],
): Set<string> {
  return new Set(
    links
      .map((c) => c.slug ?? c.href.split("/").filter(Boolean).pop() ?? "")
      .filter(Boolean),
  );
}
