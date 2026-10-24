/**
 * Sitemap and Indexability filtering rules.
 *
 * Ensures sitemap.xml and static prerendering parameters strictly correspond
 * to genuinely accessible, indexable products by filtering against the active
 * category slug set.
 */

export interface SitemapProductCandidate {
  slug: string;
  category?: string | null;
  _updatedAt?: string;
}

/**
 * Filter product candidates for sitemap and static generation.
 *
 * - When activeCategorySlugs is provided (Set), only products belonging to
 *   an active category are included.
 * - Products in inactive categories (e.g. hidden lines or draft categories) are omitted.
 * - When activeCategorySlugs is null (fallback / error mode), all valid products
 *   with a slug are preserved (fails open to prevent empty sitemaps).
 */
export function filterProductsForSitemap<T extends SitemapProductCandidate>(
  products: T[],
  activeCategorySlugs: Set<string> | null,
): T[] {
  if (!Array.isArray(products)) return [];
  if (!activeCategorySlugs) {
    return products.filter(
      (p) => p && typeof p.slug === "string" && p.slug.trim().length > 0,
    );
  }
  return products.filter((p) => {
    if (!p || typeof p.slug !== "string" || !p.slug.trim()) return false;
    const cat = String(p.category ?? "").trim();
    return Boolean(cat && activeCategorySlugs.has(cat));
  });
}
