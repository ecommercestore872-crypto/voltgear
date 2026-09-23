import {
  fetchActiveCategories as fetchActiveCategoriesFromDb,
  fetchCatalogFromDb,
  fetchCategoryCounts as fetchCategoryCountsFromDb,
} from "@/lib/db/store";
import type { Product, ProductCategory } from "@/lib/types";

export { CATEGORIES } from "@/lib/categories";

/** Page size for server-side pagination of catalog/search results. */
export const PRODUCTS_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "in-stock", label: "In Stock" },
] as const;

export type CatalogSort = (typeof SORT_OPTIONS)[number]["value"];
export type CatalogAvailability = (typeof AVAILABILITY_OPTIONS)[number]["value"];

export interface CatalogFilters {
  category?: ProductCategory;
  query?: string;
  sort: CatalogSort;
  availability: CatalogAvailability;
  minPrice?: number;
  maxPrice?: number;
  page: number;
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function toInt(v: unknown, fallback = 1): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function asSort(v: unknown): CatalogSort {
  return SORT_OPTIONS.some((o) => o.value === v) ? (v as CatalogSort) : "featured";
}

function asAvailability(v: unknown): CatalogAvailability {
  return AVAILABILITY_OPTIONS.some((o) => o.value === v)
    ? (v as CatalogAvailability)
    : "all";
}

/** Parse + normalize URL search params into safe catalog filters. */
export function parseCatalogFilters(
  searchParams: { [key: string]: string | string[] | undefined } | Record<string, unknown>,
  category?: ProductCategory
): CatalogFilters {
  const sp = (k: string): string | undefined => {
    const v = (searchParams as Record<string, unknown>)[k];
    if (Array.isArray(v)) return String(v[0]);
    if (typeof v === "string") return v;
    if (v !== null && v !== undefined) return String(v);
    return undefined;
  };

  const query = sp("q");
  const queryClean = query ? query.replace(/\s+/g, " ").trim().slice(0, 80) : undefined;

  let minPrice = toNum(sp("minPrice"));
  let maxPrice = toNum(sp("maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    category,
    query: queryClean || undefined,
    sort: asSort(sp("sort")),
    availability: asAvailability(sp("availability")),
    minPrice,
    maxPrice,
    page: toInt(sp("page"), 1),
  };
}

/** Build a URL query string for the catalog, applying `changes` over `base`. */
export function buildCatalogUrl(
  basePath: string,
  base: Record<string, string | undefined>,
  changes: Record<string, string | undefined>
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && v !== "") merged[k] = v;
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === "") delete merged[k];
    else merged[k] = v;
  }
  const sp = new URLSearchParams(merged).toString();
  return sp ? `${basePath}?${sp}` : basePath;
}

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
