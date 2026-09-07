import type { MetadataRoute } from "next";

import { FALLBACK_BLOG_POSTS } from "@/lib/blog-data";
import { FALLBACK_SHOP_TYPES } from "@/lib/categories";
import { fetchSitemapCollections } from "@/lib/db/collection-store";
import { fetchShopTypes, fetchSitemapPages, fetchSitemapProducts } from "@/lib/db/store";
import { indexSiteUrl } from "@/lib/seo-rules";

export const dynamic = "force-dynamic";

function entry(
  url: string,
  lastModified?: string | Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  priority = 0.5
): MetadataRoute.Sitemap[number] {
  return {
    url,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = indexSiteUrl();

  let products: { slug: string; _updatedAt?: string }[] = [];
  let shopTypes: { slug: string }[] = [];
  let pages: { slug: string; pageType?: string; _updatedAt?: string }[] = [];
  let collections: { slug: string; _updatedAt?: string }[] = [];

  try {
    const [p, types, slugs, cols] = await Promise.all([
      fetchSitemapProducts().catch(() => []),
      fetchShopTypes().catch(() => []),
      fetchSitemapPages().catch(() => []),
      fetchSitemapCollections().catch(() => []),
    ]);
    products = p || [];
    shopTypes = types || [];
    pages = slugs || [];
    collections = cols || [];
  } catch {
    products = [];
  }

  if (shopTypes.length === 0) {
    shopTypes = FALLBACK_SHOP_TYPES.map((t) => ({ slug: t.slug }));
  }

  const blogs = pages.filter((page) => page.pageType === "blog" && page.slug);
  const cms = pages.filter((page) => page.pageType !== "blog" && page.slug);

  const staticRoutes: MetadataRoute.Sitemap = [
    entry(`${baseUrl}/`, new Date(), "daily", 1),
    entry(`${baseUrl}/products`, new Date(), "daily", 0.9),
    entry(`${baseUrl}/about`, new Date(), "weekly", 0.5),
    entry(`${baseUrl}/faq`, new Date(), "weekly", 0.5),
    entry(`${baseUrl}/contact`, new Date(), "weekly", 0.5),
    entry(`${baseUrl}/blog`, new Date(), "weekly", 0.55),
    entry(`${baseUrl}/shipping-returns`, undefined, "monthly", 0.4),
    entry(`${baseUrl}/warranty`, undefined, "monthly", 0.4),
    entry(`${baseUrl}/privacy-policy`, undefined, "monthly", 0.3),
    entry(`${baseUrl}/cookies`, undefined, "monthly", 0.3),
    entry(`${baseUrl}/terms-of-service`, undefined, "monthly", 0.3),
    entry(`${baseUrl}/llms.txt`, new Date(), "weekly", 0.3),
  ];

  const categoryRoutes = shopTypes.map((cat) =>
    entry(`${baseUrl}/products/${cat.slug}`, undefined, "daily", 0.85)
  );

  const collectionRoutes = collections
    .filter((col) => col.slug)
    .map((col) =>
      entry(`${baseUrl}/collections/${col.slug}`, col._updatedAt, "weekly", 0.75)
    );

  const productRoutes = products
    .filter((prod) => prod.slug)
    .map((prod) =>
      entry(`${baseUrl}/product/${prod.slug}`, prod._updatedAt, "weekly", 0.7)
    );

  const sitemapBlogs =
    blogs.length > 0
      ? blogs
      : FALLBACK_BLOG_POSTS.map((post) => ({
          slug: post.slug,
          _updatedAt: post.publishedAt,
        }));
  const blogRoutes = sitemapBlogs.map((post) =>
    entry(`${baseUrl}/blog/${post.slug}`, post._updatedAt, "weekly", 0.55)
  );

  const reserved = new Set([
    "about",
    "faq",
    "contact",
    "blog",
    "shipping-returns",
    "warranty",
    "privacy-policy",
    "terms-of-service",
    "cookies",
  ]);
  const cmsRoutes = cms
    .filter((page) => page.slug && !reserved.has(page.slug))
    .map((page) =>
      entry(`${baseUrl}/${page.slug}`, page._updatedAt, "monthly", 0.4)
    );

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...collectionRoutes,
    ...productRoutes,
    ...blogRoutes,
    ...cmsRoutes,
  ];
}
