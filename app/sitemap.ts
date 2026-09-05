import type { MetadataRoute } from "next";

import { fetchAllProducts, fetchBlogPosts, fetchPageSlugs, fetchShopTypes } from "@/lib/db/store";
import { indexSiteUrl } from "@/lib/seo-rules";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = indexSiteUrl();
  const now = new Date();

  let products: { slug?: string; _id?: string }[] = [];
  let shopTypes: { slug: string }[] = [];
  let posts: { slug?: string }[] = [];
  let pages: { slug: string }[] = [];

  try {
    const [p, types, blogs, slugs] = await Promise.all([
      fetchAllProducts().catch(() => []),
      fetchShopTypes().catch(() => []),
      fetchBlogPosts().catch(() => []),
      fetchPageSlugs().catch(() => []),
    ]);
    products = p || [];
    shopTypes = types || [];
    posts = blogs || [];
    pages = slugs || [];
  } catch {
    products = [];
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/products",
    "/about",
    "/faq",
    "/contact",
    "/blog",
    "/shipping-returns",
    "/warranty",
    "/privacy-policy",
    "/terms-of-service",
  ].map((path, index) => ({
    url: `${baseUrl}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: index < 2 ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/products" ? 0.9 : 0.5,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = shopTypes.map((cat) => ({
    url: `${baseUrl}/products/${cat.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.85,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${baseUrl}/product/${prod.slug || prod._id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogRoutes: MetadataRoute.Sitemap = posts
    .filter((post) => post.slug)
    .map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.55,
    }));

  const reserved = new Set([
    "about",
    "faq",
    "contact",
    "blog",
    "shipping-returns",
    "warranty",
    "privacy-policy",
    "terms-of-service",
  ]);
  const cmsRoutes: MetadataRoute.Sitemap = pages
    .filter((page) => page.slug && !reserved.has(page.slug))
    .map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...blogRoutes, ...cmsRoutes];
}
