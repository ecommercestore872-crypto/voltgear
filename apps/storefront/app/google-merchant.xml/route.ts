import { NextResponse } from "next/server";
import { fetchCatalogProducts } from "@/lib/db/store";
import { merchantItemXml, xmlEscape } from "@/lib/merchant-feed";
import { imageUrl } from "@/lib/sanity/image";
import { indexSiteUrl, absoluteUrl } from "@/lib/seo-rules";

export const revalidate = 3600;

export async function GET() {
  const baseUrl = indexSiteUrl();
  const products = await fetchCatalogProducts().catch(() => []);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Buy n Try - Electronics Accessories Pakistan</title>
    <link>${xmlEscape(baseUrl)}</link>
    <description>Smartwatches, earbuds, power banks and accessories.</description>
`;

  for (const product of products) {
    const raw = product.images?.[0] || product.cloudinaryImages?.[0];
    const img = raw ? imageUrl(raw, { w: 800 }) : undefined;
    const image = img && img.startsWith("/") ? absoluteUrl(img) : img;
    const item = merchantItemXml(product, absoluteUrl(`/product/${product.slug}`), image);
    if (item) xml += item;
  }

  xml += `  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
