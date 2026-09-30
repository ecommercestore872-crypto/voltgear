import type { Product } from "@/lib/types";

import { pdpProductCacheTag } from "./gadget-pdp-lcp";

export const WARM_PDP_SLUG_LIMIT = 40;
export const WARM_HTTP_FETCH_LIMIT = 20;

const CORE_PATHS = [
  "/",
  "/products",
  "/cod/lahore",
  "/cod/karachi",
  "/cod/islamabad",
  "/cod/rawalpindi",
] as const;

export function storefrontWarmPaths(): readonly string[] {
  return CORE_PATHS;
}

/** Featured and high-traffic PDPs first (ad landing pages). */
export function rankProductSlugsForWarm(products: Product[]): string[] {
  const seen = new Set<string>();
  const ranked = [...products].sort((a, b) => {
    const feat = Number(b.featured) - Number(a.featured);
    if (feat !== 0) return feat;
    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
  const slugs: string[] = [];
  for (const p of ranked) {
    const slug = p.slug?.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
    if (slugs.length >= WARM_PDP_SLUG_LIMIT) break;
  }
  return slugs;
}

export function warmPdpCacheTags(slugs: string[]): string[] {
  return slugs.map((slug) => pdpProductCacheTag(slug));
}

export function warmProductPaths(slugs: string[]): string[] {
  return slugs
    .slice(0, WARM_HTTP_FETCH_LIMIT)
    .map((slug) => `/product/${encodeURIComponent(slug)}`);
}
