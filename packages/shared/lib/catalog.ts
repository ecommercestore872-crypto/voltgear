import {
  fetchActiveCategories as fetchActiveCategoriesFromDb,
  fetchCatalogFromDb,
  fetchCategoryCounts as fetchCategoryCountsFromDb,
} from "@/lib/db/store";
import type { CatalogFilters, CatalogResult } from "@/lib/catalog-rules";

export { CATEGORIES } from "@/lib/categories";
export {
  AVAILABILITY_OPTIONS,
  PRODUCTS_PAGE_SIZE,
  SORT_OPTIONS,
  buildCatalogUrl,
  parseCatalogFilters,
  type CatalogAvailability,
  type CatalogFilters,
  type CatalogResult,
  type CatalogSort,
} from "@/lib/catalog-rules";

export async function fetchCatalog(
  f: CatalogFilters,
  opts: { basePath?: string; includeDemo?: boolean } = {}
): Promise<CatalogResult> {
  void opts.basePath;
  return fetchCatalogFromDb({ ...f, includeDemo: opts.includeDemo });
}

export async function fetchCategoryCounts(includeDemo = false): Promise<Record<string, number>> {
  return fetchCategoryCountsFromDb(includeDemo);
}

export async function fetchActiveCategories(includeDemo = false): Promise<string[]> {
  return fetchActiveCategoriesFromDb(includeDemo);
}
