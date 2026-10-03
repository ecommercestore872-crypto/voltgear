import { withShopApiObservability } from "@/lib/shop-api-observability";
import { NextResponse } from "next/server";
import { fetchAllProducts } from "@/lib/db/store";
import { generateTikTokCatalogCSV } from "@/lib/catalog/tiktok-csv";

/** On-demand generation; CDN caches via Cache-Control (no build-time DB). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function GETHandler() {
  const products = await fetchAllProducts(false);
  const csv = generateTikTokCatalogCSV(products);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export const GET = withShopApiObservability("GET /api/catalog/tiktok.csv", GETHandler);
