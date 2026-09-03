import type { MetadataRoute } from "next";
import { fetchAllProducts, fetchShopTypes } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://voltgear.pk";

  let products: any[] = [];
  let shopTypes: any[] = [];

  try {
    const res = await Promise.all([
      fetchAllProducts().catch(() => []),
      fetchShopTypes().catch(() => []),
    ]);
    products = res[0] || [];
    shopTypes = res[1] || [];
  } catch {
    products = [];
    shopTypes = [];
  }

  const now = new Date();

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Category routes
  const categoryRoutes: MetadataRoute.Sitemap = shopTypes.map((cat) => ({
    url: `${baseUrl}/products/${cat.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Product routes
  const productRoutes: MetadataRoute.Sitemap = products.map((prod) => ({
    url: `${baseUrl}/product/${prod.slug || prod._id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
