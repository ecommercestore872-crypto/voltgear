import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchBlogPosts, fetchHomeBestsellers, fetchShopTypes, fetchSiteSettings } from "@/lib/db/store";
import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { mergeBlogCatalog } from "@/lib/blog-desk-rules";
import { SHOPPER_BRAND } from "@/lib/brand";
import { indexSiteUrl, llmsTxt } from "@/lib/seo-rules";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

export const revalidate = 300;

export async function GET() {
  const [types, settings, top, blog] = await Promise.all([
    fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES),
    fetchSiteSettings().catch(() => null),
    fetchHomeBestsellers().catch(() => []),
    fetchBlogPosts().catch(() => []),
  ]);
  const posts = mergeBlogCatalog(blog, FALLBACK_BLOG_POSTS);
  const body = llmsTxt({
    guides: posts.map((p) => ({ title: p.title, slug: p.slug })),
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
