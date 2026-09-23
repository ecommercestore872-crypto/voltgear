import type { Product } from "@/lib/types";
import { WISHLIST_RECOMMEND_UI_LIMIT } from "@/lib/wishlist-product-fetch-rules";

export async function loadWishlistRecommendations(
  excludeSlugs: ReadonlySet<string>,
  category: string,
): Promise<Product[]> {
  try {
    const params = new URLSearchParams({
      recommend: "1",
      limit: String(WISHLIST_RECOMMEND_UI_LIMIT),
    });
    const cat = category.trim();
    if (cat) params.set("category", cat);
    const exclude = [...excludeSlugs].join(",");
    if (exclude) params.set("exclude", exclude);

    const res = await fetch(`/api/store/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}