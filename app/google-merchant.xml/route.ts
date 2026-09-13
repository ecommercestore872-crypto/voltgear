import { NextResponse } from "next/server";
import { fetchCatalogProducts } from "@/lib/db/store";
import { indexSiteUrl, absoluteUrl } from "@/lib/seo-rules";

export const revalidate = 3600;

export async function GET() {
  const baseUrl = indexSiteUrl();
  let products = await fetchCatalogProducts().catch(() => []);
  
  // Google Merchant Center XML Format
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Buy n Try - Official Store</title>
    <link>${baseUrl}</link>
    <description>Quality electronics, smartwatches, earbuds, and accessories.</description>
`;

  products.forEach((product) => {
    const productUrl = absoluteUrl(`/product/${product.slug}`);
    const image = product.images?.[0] || product.cloudinaryImages?.[0] || "";
    // Ensure accurate availability mapping
    const isOutOfStock = product.stockStatus === 'out_of_stock' || product.stockStatus === 'discontinued';
    const availability = isOutOfStock ? "out of stock" : "in stock";

    xml += `    <item>
      <g:id><![CDATA[${product.id || product.slug}]]></g:id>
      <g:title><![CDATA[${product.name}]]></g:title>
      <g:description><![CDATA[${product.shortDescription || product.name}]]></g:description>
      <g:link>${productUrl}</g:link>
      ${image ? `<g:image_link>${image}</g:image_link>` : ""}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${product.price} PKR</g:price>
      <g:brand>Buy n Try</g:brand>
      ${product.category ? `<g:product_type><![CDATA[${product.category}]]></g:product_type>` : ''}
    </item>\n`;
  });

  xml += `  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
