import {
  fetchCatalogFeaturedByCategory,
  fetchCatalogFeaturedProducts,
  fetchCatalogNewestProducts,
} from "@/lib/db/store";
import type { Product } from "@/lib/types";
import {
  clampRecommendLimit,
  MAX_RECOMMEND_API_LIMIT,
  pickWishlistRecommendations,
  WISHLIST_RECOMMEND_UI_LIMIT,
} from "@/lib/wishlist-product-fetch-rules";

export async function resolveStorefrontRecommendations(
  category: string,
  excludeSlugs: ReadonlySet<string>,
  limitParam: number | string | null = WISHLIST_RECOMMEND_UI_LIMIT,
  includeDemo = false,
): Promise<Product[]> {
  const target = clampRecommendLimit(
    limitParam == null ? null : String(limitParam),
    WISHLIST_RECOMMEND_UI_LIMIT,
  );
  const pool: Product[] = [];
  const fetchCap = MAX_RECOMMEND_API_LIMIT;

  const cat = category.trim();
  if (cat) {
    pool.push(
      ...(await fetchCatalogFeaturedByCategory(cat, fetchCap, includeDemo)),
    );
  }

  let picked = pickWishlistRecommendations(pool, excludeSlugs, target) as Product[];
  if (picked.length >= target) return picked;

  pool.push(...(await fetchCatalogFeaturedProducts(fetchCap, includeDemo)));
  picked = pickWishlistRecommendations(pool, excludeSlugs, target) as Product[];
  if (picked.length >= target) return picked;

  pool.push(...(await fetchCatalogNewestProducts(fetchCap, includeDemo)));
  return pickWishlistRecommendations(pool, excludeSlugs, target) as Product[];
}