export const HOME_SECTION_IDS = [
  "categories",
  "trust",
  "bestsellers",
  "featured",
  "offers",
  "lifestyle",
  "reviews",
  "blog",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type HomeSectionEntry = { id: HomeSectionId; enabled: boolean };

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  trust: "Trust strip",
  bestsellers: "Best Sellers",
  featured: "Featured product",
  offers: "Best Offers",
  lifestyle: "Lifestyle shop",
  categories: "Shop categories",
  reviews: "Reviews",
  blog: "Blog",
};

export const DEFAULT_HOME_SECTIONS: HomeSectionEntry[] = HOME_SECTION_IDS.map(
  (id) => ({ id, enabled: true })
);

const ID_SET = new Set<string>(HOME_SECTION_IDS);

export function normalizeHomeSections(raw: unknown): HomeSectionEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_HOME_SECTIONS.map((s) => ({ ...s }));

  const seen = new Set<HomeSectionId>();
  const out: HomeSectionEntry[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string" || !ID_SET.has(id)) continue;
    const sid = id as HomeSectionId;
    if (seen.has(sid)) continue;
    seen.add(sid);
    out.push({
      id: sid,
      enabled: (item as { enabled?: unknown }).enabled !== false,
    });
  }

  for (const id of HOME_SECTION_IDS) {
    if (seen.has(id)) continue;
    const fallback = DEFAULT_HOME_SECTIONS.find((section) => section.id === id);
    const entry = { id, enabled: fallback?.enabled ?? true };
    if (id === "lifestyle") {
      const reviewsAt = out.findIndex((section) => section.id === "reviews");
      if (reviewsAt === -1) out.push(entry);
      else out.splice(reviewsAt, 0, entry);
      continue;
    }
    out.push(entry);
  }
  return out;
}

export function enabledHomeSectionIds(
  sections: HomeSectionEntry[]
): HomeSectionId[] {
  return sections.filter((s) => s.enabled).map((s) => s.id);
}

export function placeSectionBefore(
  sections: HomeSectionEntry[],
  id: HomeSectionId,
  beforeId: HomeSectionId
): HomeSectionEntry[] {
  const moving = sections.find((section) => section.id === id);
  const without = sections.filter((section) => section.id !== id);
  if (!moving) return without;
  const at = without.findIndex((section) => section.id === beforeId);
  if (at === -1) return [...without, moving];
  return [...without.slice(0, at), moving, ...without.slice(at)];
}
