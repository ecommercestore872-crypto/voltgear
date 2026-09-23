import { NextResponse } from "next/server";
import { fetchAllProducts } from "@/lib/db/store";
import { resolveTikTokContentId } from "@/lib/tiktok-browser-events";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export function escapeCSV(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function extractPlainText(blocks: any): string {
  if (!blocks) return "";
  if (typeof blocks === "string") return blocks;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map(block => {
      // Only extract text from standard portable text blocks
      if (block._type !== "block" && block._type !== "paragraph") return "";
      if (!block.children) return "";
      return block.children.map((child: any) => child.text || "").join("");
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateCSV(products: any[]): string {
  let csv = `sku_id,title,description,availability,condition,price,link,image_link,brand\n`;
  const seenSkuIds = new Set<string>();

  for (const product of products) {
    if (product.isDemo) continue; // Safety check

    const baseLink = `https://buyntryy.com/product/${product.slug}`;
    const baseImage = product.images?.[0] || "";
    let imageLink = baseImage;
    if (imageLink.startsWith("/")) {
      imageLink = `https://buyntryy.com${imageLink}`;
    }

    const rawDesc = extractPlainText(product.description) || product.shortDescription || product.name || "";
    const cleanDesc = rawDesc.replace(/\s+/g, " ").trim() || "Amazing product by Buy n Try";
    
    const brand = product.brand ? product.brand.trim() : "Unbranded";

    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        const skuId = resolveTikTokContentId({
          variantSku: variant.sku,
          sku: product.sku,
          slug: product.slug,
          variantKey: variant._key
        });
        if (!skuId) continue;
        if (seenSkuIds.has(skuId)) continue; // No duplicates mapping to identical ID
        seenSkuIds.add(skuId);
        
        const title = `${product.name} - ${variant.name}`;
        const price = variant.price ?? product.price;
        
        let stock = "in stock";
        if (variant.stockStatus === "out-of-stock" || product.stockStatus === "out-of-stock" || product.quantity === 0) {
          stock = "out of stock";
        }

        let varImage = variant.image || imageLink;
        if (varImage.startsWith("/")) varImage = `https://buyntryy.com${varImage}`;

        csv += [
          escapeCSV(skuId),
          escapeCSV(title),
          escapeCSV(cleanDesc),
          escapeCSV(stock),
          escapeCSV("new"),
          escapeCSV(`${price} PKR`),
          escapeCSV(baseLink),
          escapeCSV(varImage),
          escapeCSV(brand)
        ].join(",") + "\n";
      }
    } else {
      const skuId = resolveTikTokContentId({
        sku: product.sku,
        slug: product.slug
      });
      if (!skuId) continue;
      if (seenSkuIds.has(skuId)) continue;
      seenSkuIds.add(skuId);
      
      const price = product.price;
      let stock = "in stock";
      if (product.stockStatus === "out-of-stock" || product.quantity === 0) {
        stock = "out of stock";
      }

      csv += [
        escapeCSV(skuId),
        escapeCSV(product.name),
        escapeCSV(cleanDesc),
        escapeCSV(stock),
        escapeCSV("new"),
        escapeCSV(`${price} PKR`),
        escapeCSV(baseLink),
        escapeCSV(imageLink),
        escapeCSV(brand)
      ].join(",") + "\n";
    }
  }

  return csv;
}

export async function GET() {
  const products = await fetchAllProducts(false); // exclude demo
  const csv = generateCSV(products);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
