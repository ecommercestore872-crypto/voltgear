export type ShopType = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  sortOrder: number;
  productCount?: number;
  active?: boolean;
};

export const FALLBACK_SHOP_TYPES: ShopType[] = [
  {
    name: "Smartwatches",
    slug: "smartwatch",
    description: "Track your health and stay connected.",
    imageUrl: "/categories/smartwatch.webp",
    sortOrder: 1,
  },
  {
    name: "Power Banks",
    slug: "power-bank",
    description: "Reliable, fast portable power.",
    imageUrl: "/categories/power-bank.webp",
    sortOrder: 2,
  },
  {
    name: "Chargers & Adapters",
    slug: "charger",
    description: "Fast, safe charging for every device.",
    imageUrl: "/categories/charger.webp",
    sortOrder: 3,
  },
  {
    name: "Earbuds & Handsfree",
    slug: "earbuds",
    description: "Immersive sound. All-day comfort.",
    imageUrl: "/categories/earbuds.webp",
    sortOrder: 4,
  },
  {
    name: "Ring Lights & Studio",
    slug: "ring-light",
    description: "Professional lighting for creators, streaming and studio photography.",
    imageUrl: "/categories/ring-light.webp",
    sortOrder: 5,
  },
  {
    name: "Selfie Sticks",
    slug: "selfie-stick",
    description: "Portable wireless Bluetooth selfie sticks with remote and tripod modes.",
    imageUrl: "/categories/selfie-stick.webp",
    sortOrder: 6,
  },
  {
    name: "Tripods & Stands",
    slug: "tripod",
    description:
      "Camera and phone tripods for creators — overhead, boom-arm, AI tracking and full-size stands.",
    imageUrl: "/categories/tripod.webp",
    sortOrder: 7,
  },
  {
    name: "Microphones & Audio",
    slug: "microphones",
    description: "Wireless lavalier microphones, studio noise-canceling mic systems & lapels.",
    imageUrl: "/categories/microphone.webp",
    sortOrder: 8,
  },
  {
    name: "Accessories",
    slug: "accessories",
    description:
      "Stylus pens and everyday tech accessories for phones, tablets and touchscreen devices.",
    imageUrl: "/categories/accessories.webp",
    sortOrder: 9,
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
