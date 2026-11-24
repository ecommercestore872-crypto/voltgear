import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchHomeBestsellers, fetchShopTypes, fetchSiteSettings } from "@/lib/db/store";
import { SHOPPER_BRAND } from "@/lib/brand";
import { indexSiteUrl, llmsTxt } from "@/lib/seo-rules";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

export const revalidate = 300;

export async function GET() {
  const [types, settings, top] = await Promise.all([
    fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
    fetchSiteSettings().catch(() => null),
    fetchHomeBestsellers().catch(() => []),
  ]);
  const body = llmsTxt({
    siteUrl: indexSiteUrl(),
    brandName: settings?.brandName?.trim() || SHOPPER_BRAND.spokenName,
    categories: (types.length ? types : FALLBACK_SHOP_TYPES).map((type) => ({
      name: type.name,
      path: `/products/${type.slug}`,
    })),
    settings: settings ?? undefined,
    topProducts: top.slice(0, 5).map((p) => ({ name: p.name, slug: p.slug, price: p.price })),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, s-maxage=${STOREFRONT_CATALOG_REVALIDATE}, stale-while-revalidate=86400`,
    },
  });
}
