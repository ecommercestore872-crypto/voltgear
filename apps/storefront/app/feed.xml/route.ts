import { NextResponse } from "next/server";
import { fetchCatalogProducts } from "@/lib/db/store";
import { indexSiteUrl, absoluteUrl } from "@/lib/seo-rules";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const baseUrl = indexSiteUrl();
  let products = await fetchCatalogProducts().catch(() => []);
  
  // Create RSS 2.0 XML
  let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Buy n Try - Latest Tech & Accessories</title>
    <link>${baseUrl}</link>
    <description>Shop smartwatches, earbuds, power banks, chargers and ring lights in Pakistan with Cash on Delivery.</description>
    <language>en-pk</language>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
`;

  products.slice(0, 100).forEach((product) => {
    const productUrl = absoluteUrl(`/product/${product.slug}`);
    const image = product.images?.[0] || product.cloudinaryImages?.[0] || "";
    
    xml += `    <item>
      <title><![CDATA[${product.name}]]></title>
      <link>${productUrl}</link>
      <guid isPermaLink="true">${productUrl}</guid>
      <description><![CDATA[${product.shortDescription || product.name}. ${image ? `<img src="${image}" />` : ''}]]></description>
      ${product.category ? `<category><![CDATA[${product.category}]]></category>` : ''}
      <pubDate>${new Date(product.createdAt || Date.now()).toUTCString()}</pubDate>
    </item>\n`;
  });

  xml += `  </channel>\n</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
