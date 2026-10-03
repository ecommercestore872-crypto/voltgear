import { fetchAllProducts } from "@/lib/db/store";
import { portableTextToPlain } from "@/lib/product-detail-copy";
import { resolveTikTokContentId } from "@/lib/tiktok-browser-events";

export function escapeCSV(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return "";
  const str = String(val).trim();
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** @deprecated Prefer `portableTextToPlain`; kept for feed unit tests. */
export function extractPlainText(blocks: unknown): string {
  return portableTextToPlain(blocks);
}

export type TikTokCatalogProduct = Awaited<
  ReturnType<typeof fetchAllProducts>
>[number];

export function generateTikTokCatalogCSV(products: TikTokCatalogProduct[]): string {
  let csv = `sku_id,title,description,availability,condition,price,link,image_link,brand\n`;
  const seenSkuIds = new Set<string>();

  for (const product of products) {
    if (product.isDemo) continue;

    const baseLink = `https://buyntryy.com/product/${product.slug}`;
    const baseImage = product.images?.[0] || "";
    let imageLink = baseImage;
    if (imageLink.startsWith("/")) {
      imageLink = `https://buyntryy.com${imageLink}`;
    }

    const rawDesc =
      portableTextToPlain(product.description) ||
      product.shortDescription ||
      product.name ||
      "";
    const cleanDesc =
      rawDesc.replace(/\s+/g, " ").trim() || "Amazing product by Buy n Try";

    const brand = product.brand ? product.brand.trim() : "Unbranded";

    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        const skuId = resolveTikTokContentId({
          variantSku: variant.sku,
          sku: product.sku,
          slug: product.slug,
          variantKey: variant._key,
        });
        if (!skuId) continue;
        if (seenSkuIds.has(skuId)) continue;
        seenSkuIds.add(skuId);

        const title = `${product.name} - ${variant.name}`;
        const price = variant.price ?? product.price;

        let stock = "in stock";
        if (
          variant.stockStatus === "out-of-stock" ||
          product.stockStatus === "out-of-stock" ||
          product.quantity === 0
        ) {
          stock = "out of stock";
        }

        let varImage = variant.image || imageLink;
        if (varImage.startsWith("/")) varImage = `https://buyntryy.com${varImage}`;

        csv +=
          [
            escapeCSV(skuId),
            escapeCSV(title),
            escapeCSV(cleanDesc),
            escapeCSV(stock),
            escapeCSV("new"),
            escapeCSV(`${price} PKR`),
            escapeCSV(baseLink),
            escapeCSV(varImage),
            escapeCSV(brand),
          ].join(",") + "\n";
      }
    } else {
      const skuId = resolveTikTokContentId({
        sku: product.sku,
        slug: product.slug,
      });
      if (!skuId) continue;
      if (seenSkuIds.has(skuId)) continue;
      seenSkuIds.add(skuId);

      const price = product.price;
      let stock = "in stock";
      if (product.stockStatus === "out-of-stock" || product.quantity === 0) {
        stock = "out of stock";
      }

      csv +=
        [
          escapeCSV(skuId),
          escapeCSV(product.name),
          escapeCSV(cleanDesc),
          escapeCSV(stock),
          escapeCSV("new"),
          escapeCSV(`${price} PKR`),
          escapeCSV(baseLink),
          escapeCSV(imageLink),
          escapeCSV(brand),
        ].join(",") + "\n";
    }
  }

  return csv;
}
