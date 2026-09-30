import { NextResponse } from "next/server";

import { fetchCatalog, parseCatalogFilters } from "@/lib/catalog";
import { isDemoRequest } from "@/lib/demo";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";
import { withShopApiObservability } from "@/lib/shop-api-observability";

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
    const filters = parseCatalogFilters(
      Object.fromEntries(searchParams.entries()),
    );
    if (!filters.query?.trim()) {
      return json({ error: "Query required" }, 400, false);
    }
    const demo = isDemoRequest(request);
    const result = await fetchCatalog(filters, { includeDemo: demo });
    return json({ result, filters }, 200, !demo);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Search failed" },
      500,
      false,
    );
  }
}

export const GET = withShopApiObservability("GET /api/catalog/search", GETHandler);
