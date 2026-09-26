import { withShopApiObservability } from "@/lib/shop-api-observability";
import { fetchSiteSettings } from "@/lib/db/store";
import { normalizeSettings } from "@/lib/site-config";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

/**
 * Public site configuration for client components (cart drawer, checkout).
 * All normalization and fallback logic lives in normalizeSettings() so the
 * storefront has exactly one source of truth. Falls back to the canonical
 * operational defaults (PKR 5,000 free-shipping threshold, Rs 199 shipping
 * fee) when Sanity is not configured.
 */
async function GETHandler() {
  try {
    const settings = await fetchSiteSettings();
    return Response.json(normalizeSettings(settings), {
      headers: {
        "Cache-Control": `public, s-maxage=${STOREFRONT_CATALOG_REVALIDATE}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return Response.json(normalizeSettings(null), {
      headers: {
        "Cache-Control": `public, s-maxage=${STOREFRONT_CATALOG_REVALIDATE}, stale-while-revalidate=86400`,
      },
    });
  }
}

export const GET = withShopApiObservability("GET /api/settings", GETHandler);
