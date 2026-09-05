import type { MetadataRoute } from "next";

import { indexSiteUrl, SEARCH_CRAWL_DISALLOW } from "@/lib/seo-rules";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = indexSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/favicon.ico", "/favicon-48.png", "/icon.png", "/apple-icon.png", "/brand/"],
        disallow: [...SEARCH_CRAWL_DISALLOW],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
