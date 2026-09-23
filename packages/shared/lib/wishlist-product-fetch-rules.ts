/** Max slugs per wishlist product lookup (untrusted client input). */
export const MAX_WISHLIST_PRODUCT_LOOKUP = 50;

/** Cards shown in the wishlist "You may also like" rail. */
export const WISHLIST_RECOMMEND_UI_LIMIT = 4;

/** Server-enforced max for recommendation API `limit` param. */
export const MAX_RECOMMEND_API_LIMIT = 8;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeWishlistSlugLookup(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const slug = String(entry ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 120);
    if (!slug || !SLUG_RE.test(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
    if (out.length >= MAX_WISHLIST_PRODUCT_LOOKUP) break;
  }
  return out;
}

export function parseWishlistSlugsQuery(param: string | null): string[] {
  if (param == null || !param.trim()) return [];
  return normalizeWishlistSlugLookup(param.split(","));
}

export function orderProductsByWishlistSlugs<T extends { slug: string }>(
  slugs: string[],
  bySlug: ReadonlyMap<string, T>,
): T[] {
  const out: T[] = [];
  for (const slug of slugs) {
    const p = bySlug.get(slug);
    if (p) out.push(p);
  }
  return out;
}

export function clampRecommendLimit(
  raw: string | null,
  defaultLimit = WISHLIST_RECOMMEND_UI_LIMIT,
): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return defaultLimit;
  return Math.min(Math.max(1, Math.floor(n)), MAX_RECOMMEND_API_LIMIT);
}

export function pickWishlistRecommendations(
  candidates: readonly { slug: string }[],
  excludeSlugs: ReadonlySet<string>,
  limit = WISHLIST_RECOMMEND_UI_LIMIT,
): { slug: string }[] {
  const seen = new Set<string>();
  const out: { slug: string }[] = [];
  for (const p of candidates) {
    const slug = p.slug?.trim();
    if (!slug || excludeSlugs.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}