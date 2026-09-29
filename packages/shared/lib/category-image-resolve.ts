import { FALLBACK_SHOP_TYPES, findShopType } from "@/lib/categories";

/** Default first-party cutout for a category slug (from FALLBACK_SHOP_TYPES). */
export function fallbackCategoryImageForSlug(slug: string): string | undefined {
  return findShopType(FALLBACK_SHOP_TYPES, slug)?.imageUrl;
}

/**
 * Storefront category image: DB/admin URL, else static WebP; upgrade legacy `/categories/*.png` → `.webp`.
 */
export function resolveCategoryImagePath(
  imageUrl: string | undefined | null,
  slug?: string,
): string | undefined {
  const raw = imageUrl?.trim();
  if (raw) {
    if (raw.startsWith("/categories/") && /\.png$/i.test(raw)) {
      return raw.replace(/\.png$/i, ".webp");
    }
    return raw;
  }
  if (slug?.trim()) {
    return fallbackCategoryImageForSlug(slug.trim());
  }
  return undefined;
}
