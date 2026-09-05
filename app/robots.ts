import type { MetadataRoute } from "next";

import { indexSiteUrl } from "@/lib/seo-rules";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = indexSiteUrl();
  const allowShop = {
    allow: "/",
    disallow: ["/admin/", "/api/admin/", "/checkout/", "/demo/"],
  };

  return {
    rules: [
      { userAgent: "*", ...allowShop },
      { userAgent: "Googlebot", allow: "/" },
      { userAgent: "Bingbot", allow: "/" },
      { userAgent: "DuckDuckBot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
