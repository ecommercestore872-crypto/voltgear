import type { Product } from "@/lib/types";

/** Preserve admin / rule ordering; drop missing or unpublished rows already filtered upstream. */
export function orderProductsByIds(
  ids: string[],
  byId: ReadonlyMap<string, Product>,
): Product[] {
  const out: Product[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) out.push(p);
  }
  return out;
}

/** Per-rail cap after published filtering (matches storefront rails). */
export function sliceRailProducts(products: Product[], limit = 8): Product[] {
  return products.slice(0, limit);
}