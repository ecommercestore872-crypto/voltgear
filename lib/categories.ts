export type ShopType = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  productCount?: number;
};

export const FALLBACK_SHOP_TYPES: ShopType[] = [
  {
    name: "Smartwatches",
    slug: "smartwatch",
    description: "Track your health and stay connected.",
    imageUrl: "/categories/smartwatch.png",
    sortOrder: 1,
  },
  {
    name: "Power Banks",
    slug: "power-bank",
    description: "Reliable, fast portable power.",
    imageUrl: "/categories/power-bank.png",
    sortOrder: 2,
  },
  {
    name: "Chargers & Adapters",
    slug: "charger",
    description: "Fast, safe charging for every device.",
    imageUrl: "/categories/charger.png",
    sortOrder: 3,
  },
  {
    name: "Earbuds & Handsfree",
    slug: "earbuds",
    description: "Immersive sound. All-day comfort.",
    imageUrl: "/categories/earbuds.png",
    sortOrder: 4,
  },
  {
    name: "Ring Lights & Studio",
    slug: "ring-light",
    description: "Professional lighting for creators, streaming and studio photography.",
    imageUrl: "/categories/ring-light.png",
    sortOrder: 5,
  },
  {
    name: "Selfie Sticks & Tripods",
    slug: "selfie-stick",
    description: "Portable wireless bluetooth selfie sticks, extendable tripods & gimbals.",
    imageUrl: "/categories/selfie-stick.png",
    sortOrder: 6,
  },
  {
    name: "Microphones & Audio",
    slug: "microphones",
    description: "Wireless lavalier microphones, studio noise-canceling mic systems & lapels.",
    imageUrl: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=600&auto=format&fit=crop",
    sortOrder: 7,
  },
];

export function shopTypeLinks(types: ShopType[]): { label: string; href: string }[] {
  return types.map((t) => ({ label: t.name, href: `/products/${t.slug}` }));
}

export function findShopType(types: ShopType[], slug: string | undefined): ShopType | null {
  if (!slug) return null;
  return types.find((t) => t.slug === slug) ?? null;
}

export function shopTypeTitle(
  types: ShopType[],
  slug: string | undefined
): { title: string; description: string } | null {
  const t = findShopType(types, slug);
  if (!t) return null;
  return { title: t.name, description: t.description };
}

/** @deprecated Prefer fetchShopTypes() — kept so leftover imports still compile. */
export const CATEGORY_LINKS = shopTypeLinks(FALLBACK_SHOP_TYPES);

/** @deprecated Prefer fetchShopTypes() */
export const CATEGORIES = FALLBACK_SHOP_TYPES.map((t) => ({
  slug: t.slug,
  label: t.name,
  href: `/products/${t.slug}`,
}));

export function getCategoryTitle(slug: string | undefined) {
  return shopTypeTitle(FALLBACK_SHOP_TYPES, slug);
}

export function categoryLabel(slug: string | undefined): string | null {
  return findShopType(FALLBACK_SHOP_TYPES, slug)?.name ?? null;
}
