import { NextResponse } from "next/server";

import {
  fetchAllProducts,
  fetchCatalogFeaturedByCategory,
  fetchCatalogFeaturedProducts,
  fetchCatalogNewestProducts,
  fetchCatalogProductsBySlugs,
  fetchProductBySlug,
} from "@/lib/db/store";
import { isDemoRequest } from "@/lib/demo";
import {
  clampRecommendLimit,
  parseWishlistSlugsQuery,
} from "@/lib/wishlist-product-fetch-rules";
import { resolveStorefrontRecommendations } from "@/lib/wishlist-recommendations-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const slugsParam = searchParams.get("slugs");
    const category = searchParams.get("category");
    const featured = searchParams.get("featured");
    const newest = searchParams.get("newest");
    const recommend = searchParams.get("recommend");
    const excludeParam = searchParams.get("exclude");
    const limitParam = searchParams.get("limit");
    const demo = isDemoRequest(request);
    if (recommend === "1") {
      const exclude = new Set(parseWishlistSlugsQuery(excludeParam));
      const products = await resolveStorefrontRecommendations(
        category ?? "",
        exclude,
        limitParam,
        demo,
      );
      return json(products);
    }
    if (slugsParam != null) {
      const slugs = parseWishlistSlugsQuery(slugsParam);
      if (!slugs.length) return json([]);
      const products = await fetchCatalogProductsBySlugs(slugs);
      return json(products);
    }
    if (slug) {
      const product = await fetchProductBySlug(slug, demo);
      return json(product);
    }
    const limit = clampRecommendLimit(limitParam);
    if (category && featured === "1") {
      const products = await fetchCatalogFeaturedByCategory(category, limit, demo);
      return json(products);
    }
    if (featured === "1") {
      const products = await fetchCatalogFeaturedProducts(limit, demo);
      return json(products);
    }
    if (newest === "1") {
      const products = await fetchCatalogNewestProducts(limit, demo);
      return json(products);
    }
    const products = await fetchAllProducts(demo);
    return json(products);
  } catch (err) {
    console.error("[store/products]", err);
    return json([], 500);
  }
}
