import type { ProductCategory } from "@/lib/types";

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

function toInt(value: unknown, fallback = 1): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0
    ? Math.min(Math.floor(number), 10_000)
    : fallback;
}

function toPrice(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0
    ? Math.min(number, 1_000_000_000)
    : undefined;
}

function asSort(value: unknown): CatalogSort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as CatalogSort)
    : "featured";
}

function asAvailability(value: unknown): CatalogAvailability {
  return AVAILABILITY_OPTIONS.some((option) => option.value === value)
    ? (value as CatalogAvailability)
    : "all";
}

export function parseCatalogFilters(
  searchParams: Record<string, unknown>,
  category?: ProductCategory,
): CatalogFilters {
  const read = (key: string): string | undefined => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0] == null ? undefined : String(value[0]);
    if (typeof value === "string") return value;
    return value == null ? undefined : String(value);
  };

  const rawQuery = read("q");
  const query = rawQuery?.replace(/\s+/g, " ").trim().slice(0, 80) || undefined;
  let minPrice = toPrice(read("minPrice"));
  let maxPrice = toPrice(read("maxPrice"));
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  return {
    category,
    query,
    sort: asSort(read("sort")),
    availability: asAvailability(read("availability")),
    minPrice,
    maxPrice,
    page: toInt(read("page")),
  };
}

export function buildCatalogUrl(
  basePath: string,
  base: Record<string, string | undefined>,
  changes: Record<string, string | undefined>,
): string {
  const merged: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== "") merged[key] = value;
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") delete merged[key];
    else merged[key] = value;
  }
  const query = new URLSearchParams(merged).toString();
  return query ? `${basePath}?${query}` : basePath;
}
