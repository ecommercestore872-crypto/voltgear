import { isPurchasablePrice } from "./product-price-rules";

/** Old store name and placeholder labels are not real manufacturer brands. */
const PLACEHOLDER_BRAND = /^(voltgear|volt gear|buy n try|master copy|universal|generic|oem)\b/i;

/**
 * Listings that copy another company's name or logo (for example "Apple Airpods", "Apple Logo").
 * Google Shopping suspends the whole Merchant account for counterfeit goods, so these stay out
 * of the feed. The store pages themselves are not touched.
 */
const REPLICA_NAME = /\b(apple logo|master copy|first copy|replica|clone|1:1)\b|^apple\b/i;

export function feedBrand(brand: string | undefined | null): string | undefined {
  const b = (brand ?? "").trim();
  return b && !PLACEHOLDER_BRAND.test(b) ? b : undefined;
}

export function isReplicaListing(p: { name: string; brand?: string | null }): boolean {
  return REPLICA_NAME.test(p.name) || /master copy|first copy|replica|clone/i.test(p.brand ?? "");
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type FeedProduct = {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  brand?: string;
  category?: string;
  price: number;
  shortDescription?: string;
  stockStatus: string;
  quantity?: number | null;
};

/** One Google Merchant <item>, or null when the product must not be in the feed. */
export function merchantItemXml(
  p: FeedProduct,
  url: string,
  imageLink: string | undefined,
): string | null {
  if (!isPurchasablePrice(p.price) || !imageLink || isReplicaListing(p)) return null;
  const brand = feedBrand(p.brand);
  const out = p.stockStatus === "out-of-stock" || p.quantity === 0;
  const text = (s: string) => xmlEscape(s.replace(/\s+/g, " ").trim());
  const lines = [
    `<g:id>${xmlEscape(String(p._id || p.sku || p.slug).slice(0, 50))}</g:id>`,
    `<title>${text(p.name).slice(0, 150)}</title>`,
    `<description>${text(p.shortDescription || p.name).slice(0, 4900)}</description>`,
    `<link>${xmlEscape(url)}</link>`,
    `<g:image_link>${xmlEscape(imageLink)}</g:image_link>`,
    `<g:condition>new</g:condition>`,
    `<g:availability>${out ? "out of stock" : "in stock"}</g:availability>`,
    `<g:price>${p.price.toFixed(2)} PKR</g:price>`,
    brand ? `<g:brand>${text(brand)}</g:brand>` : `<g:identifier_exists>no</g:identifier_exists>`,
    ...(p.category ? [`<g:product_type>${text(p.category)}</g:product_type>`] : []),
  ];
  return `    <item>\n      ${lines.join("\n      ")}\n    </item>\n`;
}
