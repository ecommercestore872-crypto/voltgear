import { NextResponse } from "next/server";

import { fetchCatalogNewestProducts, fetchShopTypes } from "@/lib/db/store";
import { isCronAuthorized, publicSiteUrl } from "@/lib/deploy-rules";
import {
  rankProductSlugsForWarm,
  storefrontWarmPaths,
  WARM_PDP_SLUG_LIMIT,
  warmProductPaths,
} from "@/lib/storefront-warm-rules";
import { withShopApiObservability } from "@/lib/shop-api-observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WARM_USER_AGENT = "voltgear-storefront-warm/1";

/**
 * Pre-render hot ISR pages before ad traffic (PDP + home + catalog).
 * Vercel Cron: GET /api/cron/warm-storefront with Authorization: Bearer CRON_SECRET
 */
async function GETHandler(request: Request) {
  if (!isCronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = publicSiteUrl().replace(/\/+$/, "");
  const [newest, shopTypes] = await Promise.all([
    fetchCatalogNewestProducts(WARM_PDP_SLUG_LIMIT, false).catch(() => []),
    fetchShopTypes().catch(() => []),
  ]);
  const categoryPaths = shopTypes.map((t) => `/products/${t.slug}`);
  const paths = [
    ...storefrontWarmPaths(),
    ...categoryPaths,
    ...warmProductPaths(rankProductSlugsForWarm(newest)),
  ];

  const results = await Promise.allSettled(
    paths.map(async (path) => {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": WARM_USER_AGENT, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) {
        throw new Error(`${path} HTTP ${res.status}`);
      }
      return path;
    }),
  );

  const warmed: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const path = paths[i];
    if (r.status === "fulfilled") warmed.push(path);
    else failed.push(path);
  }

  return NextResponse.json({
    ok: failed.length === 0,
    base,
    warmed: warmed.length,
    failed,
    paths: warmed,
  });
}

export const GET = withShopApiObservability("cron.warm-storefront", GETHandler);
