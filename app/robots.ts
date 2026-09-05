import type { MetadataRoute } from "next";

import { adsenseCrawlerRobotsRule } from "@/lib/adsense-policy";
import { indexSiteUrl, SEARCH_CRAWL_DISALLOW } from "@/lib/seo-rules";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = indexSiteUrl();
  const adsenseCrawlers = adsenseCrawlerRobotsRule();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/favicon.ico", "/favicon-48.png", "/icon.png", "/apple-icon.png", "/brand/"],
        disallow: [...SEARCH_CRAWL_DISALLOW],
      },
      {
        userAgent: adsenseCrawlers.userAgent,
        allow: adsenseCrawlers.allow,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
