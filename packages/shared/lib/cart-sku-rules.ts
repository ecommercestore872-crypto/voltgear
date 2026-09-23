import { resolveTikTokContentId } from "@/lib/tiktok-browser-events";

/** Optional product-level SKU on a cart/order line (not variant SKU). */
export type LineSkuFields = {
  sku?: string;
  variantSku?: string;
  slug: string;
  variantKey?: string;
};

/** Keep existing SKU when merging cart lines; fill from incoming if absent. */
export function mergeRetainedSku(
  existingSku?: string | null,
  incomingSku?: string | null
): string | undefined {
  const existing = (existingSku ?? "").trim();
  if (existing) return existing;
  const incoming = (incomingSku ?? "").trim();
  return incoming || undefined;
}

/** Round-trip through JSON like localStorage cart persistence. */
export function hydrateCartItemsFromStorage<T>(items: T[]): T[] {
  return JSON.parse(JSON.stringify(items)) as T[];
}

/** Same content_id helper used for PDP → cart → checkout → purchase lines. */
export function tikTokContentIdForLine(line: LineSkuFields): string | null {
  return resolveTikTokContentId({
    variantSku: line.variantSku,
    sku: line.sku,
    slug: line.slug,
    variantKey: line.variantKey,
  });
}
