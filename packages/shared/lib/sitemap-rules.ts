/**
 * Sitemap and Indexability filtering rules.
 *
 * Ensures sitemap.xml and static prerendering parameters strictly correspond
 * to genuinely accessible, indexable products by filtering against the active
 * category visibility state.
 */

import {
  categoryIsStorefrontVisible,
  type CategoryVisibilityResolution,
} from "./catalog-visibility-rules";

export interface SitemapProductCandidate {
  slug: string;
  category?: string | null;
  _updatedAt?: string;
}

/**
 * Filter product candidates for sitemap and static generation.
 *
 * Rules:
 * 1. When CategoryVisibilityResolution is provided:
 *    - "configured" (with active categories): only products in active categories are included.
 *    - "configured" (with zero active categories): returns [] (all categories disabled, no products exposed).
 *    - "query_failure": returns [] (fail safe: prevents leaking inactive category URLs during database errors).
 *    - "unconfigured": includes all valid products with non-empty slugs.
 * 2. When ReadonlySet<string> is provided:
 *    - If Set has items: only products in the set are included.
 *    - If Set is empty (size 0): returns [] (zero active categories).
 * 3. When null is provided (unconfigured fallback):
 *    - Preserves all valid products with non-empty slugs.
 * 4. Products with invalid/empty slugs or in inactive categories are strictly excluded.
 */
export function filterProductsForSitemap<T extends SitemapProductCandidate>(
  products: T[],
  categoryFilter: CategoryVisibilityResolution | ReadonlySet<string> | null,
): T[] {
  if (!Array.isArray(products) || products.length === 0) return [];

  // Query failure fails safe to prevent leaking inactive categories to Search Console
  if (
    categoryFilter &&
    typeof categoryFilter === "object" &&
    "status" in categoryFilter &&
    categoryFilter.status === "query_failure"
  ) {
    return [];
  }

  // Configured with zero active categories emits no products
  if (
    categoryFilter &&
    typeof categoryFilter === "object" &&
    "status" in categoryFilter &&
    categoryFilter.status === "configured" &&
    categoryFilter.activeSlugs.size === 0
  ) {
    return [];
  }

  // Direct empty Set emits no products
  if (categoryFilter instanceof Set && categoryFilter.size === 0) {
    return [];
  }

  // Unconfigured table or null fallback
  if (
    categoryFilter === null ||
    (categoryFilter &&
      typeof categoryFilter === "object" &&
      "status" in categoryFilter &&
      categoryFilter.status === "unconfigured")
  ) {
    return products.filter(
      (p) => p && typeof p.slug === "string" && p.slug.trim().length > 0,
    );
  }

  // Filter against active category resolution or set
  return products.filter((p) => {
    if (!p || typeof p.slug !== "string" || !p.slug.trim()) return false;
    const cat = String(p.category ?? "").trim();
    if (!cat) return false;
    return categoryIsStorefrontVisible(cat, categoryFilter);
  });
}
