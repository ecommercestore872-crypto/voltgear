import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";

import {
  fetchCatalogFeaturedByCategory,
  fetchCatalogFeaturedProducts,
  fetchCatalogNewestProducts,
  fetchCatalogProductsBySlugs,
  fetchProductBySlug,
} from "@/lib/db/store";
import { isDemoRequest } from "@/lib/demo";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import {
  clampRecommendLimit,
  parseWishlistSlugsQuery,
} from "@/lib/wishlist-product-fetch-rules";
import { resolveStorefrontRecommendations } from "@/lib/wishlist-recommendations-server";

/** CDN + ISR — avoids a serverless hit on every cart/search upsell poll. */
export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

function json(data: unknown, status = 200, cacheable = true) {
  const headers: Record<string, string> =
    cacheable && status === 200
      ? {
          "Cache-Control": `public, s-maxage=${STOREFRONT_CATALOG_REVALIDATE}, stale-while-revalidate=86400`,
        }
      : { "Cache-Control": "private, no-store, max-age=0" };
  return NextResponse.json(data, { status, headers });
}

async function GETHandler(request: Request) {
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
    const cacheable = !demo;

    if (recommend === "1") {
      const exclude = new Set(parseWishlistSlugsQuery(excludeParam));
      const products = await resolveStorefrontRecommendations(
        category ?? "",
        exclude,
        limitParam,
        demo,
      );
      return json(products, 200, cacheable);
    }
    if (slugsParam != null) {
      const slugs = parseWishlistSlugsQuery(slugsParam);
      if (!slugs.length) return json([], 200, cacheable);
      const products = await fetchCatalogProductsBySlugs(slugs);
      return json(products, 200, cacheable);
    }
    if (slug) {
      const product = await fetchProductBySlug(slug, demo);
      return json(product, 200, cacheable);
    }
    const limit = clampRecommendLimit(limitParam);
    if (category && featured === "1") {
      const products = await fetchCatalogFeaturedByCategory(category, limit, demo);
      return json(products, 200, cacheable);
    }
    if (featured === "1") {
      const products = await fetchCatalogFeaturedProducts(limit, demo);
      return json(products, 200, cacheable);
    }
    if (newest === "1") {
      const products = await fetchCatalogNewestProducts(limit, demo);
      return json(products, 200, cacheable);
    }
    return json(
      {
        error:
          "Use query parameters (slug, slugs, featured, newest, recommend). Full-catalog export is not available on this endpoint.",
      },
      400,
      false,
    );
  } catch (err) {
    console.error("[store/products]", err);
    return json([], 500, false);
  }
}

export const GET = withShopApiObservability("GET /api/store/products", GETHandler);
