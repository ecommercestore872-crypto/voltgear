import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchShopTypes } from "@/lib/db/store";
import { SHOPPER_BRAND } from "@/lib/brand";
import { indexSiteUrl, llmsTxt } from "@/lib/seo-rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const types = await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
  const categories = (types.length ? types : FALLBACK_SHOP_TYPES).map((type) => ({
    name: type.name,
    path: `/products/${type.slug}`,
  }));
  const body = llmsTxt({
    siteUrl: indexSiteUrl(),
    brandName: SHOPPER_BRAND.spokenName,
    categories,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
