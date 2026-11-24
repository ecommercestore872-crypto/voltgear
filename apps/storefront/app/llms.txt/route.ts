import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchBlogPosts, fetchShopTypes } from "@/lib/db/store";
import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { mergeBlogCatalog } from "@/lib/blog-desk-rules";
import { SHOPPER_BRAND } from "@/lib/brand";
import { indexSiteUrl, llmsTxt } from "@/lib/seo-rules";
import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

export const revalidate = 300;

export async function GET() {
  const types = await fetchShopTypes().catch(() => FALLBACK_SHOP_TYPES);
  const categories = (types.length ? types : FALLBACK_SHOP_TYPES).map(
    (type) => ({
      name: type.name,
      path: `/products/${type.slug}`,
    }),
  );
  const posts = mergeBlogCatalog(await fetchBlogPosts().catch(() => []), FALLBACK_BLOG_POSTS);
  const body = llmsTxt({
    guides: posts.map((p) => ({ title: p.title, slug: p.slug })),
    siteUrl: indexSiteUrl(),
    brandName: SHOPPER_BRAND.spokenName,
    categories,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, s-maxage=${STOREFRONT_CATALOG_REVALIDATE}, stale-while-revalidate=86400`,
    },
  });
}
