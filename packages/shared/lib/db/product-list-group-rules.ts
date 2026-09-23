/**
 * Admin products list: group by shop type (category slug).
 * Empty shop types still appear so new categories are easy to find.
 */

export type CategoryGroupRef = { slug: string; name: string };

export function groupProductsByCategory<T extends { category: string }>(
  products: T[],
  shopTypes: CategoryGroupRef[]
): { slug: string; name: string; products: T[] }[] {
  const bySlug = new Map<string, T[]>();
  for (const p of products) {
    const slug = (p.category || "").trim() || "uncategorized";
    const list = bySlug.get(slug) ?? [];
    list.push(p);
    bySlug.set(slug, list);
  }

  const groups: { slug: string; name: string; products: T[] }[] = [];
  const seen = new Set<string>();

  for (const t of shopTypes) {
    const slug = t.slug.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    groups.push({
      slug,
      name: t.name.trim() || slug,
      products: bySlug.get(slug) ?? [],
    });
  }

  for (const [slug, list] of Array.from(bySlug.entries())) {
    if (seen.has(slug)) continue;
    groups.push({
      slug,
      name: slug === "uncategorized" ? "Uncategorized" : slug,
      products: list,
    });
  }

  return groups;
}
