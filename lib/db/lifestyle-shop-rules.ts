import {
  enabledHomeSectionIds,
  type HomeSectionEntry,
  type HomeSectionId,
} from "./home-section-rules";

export type LifestyleShopBanner = {
  imageUrl: string;
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
};

export type LifestyleShopTile = {
  title: string;
  href: string;
  imageUrl: string;
};

export type LifestyleShopConfig = {
  banner: LifestyleShopBanner;
  tiles: LifestyleShopTile[];
};

const EMPTY_BANNER: LifestyleShopBanner = {
  imageUrl: "",
  eyebrow: "",
  title: "",
  cta: "",
  href: "",
};

export const EMPTY_LIFESTYLE_TILE: LifestyleShopTile = {
  title: "",
  href: "",
  imageUrl: "",
};

export const EMPTY_LIFESTYLE_SHOP: LifestyleShopConfig = {
  banner: { ...EMPTY_BANNER },
  tiles: [
    { ...EMPTY_LIFESTYLE_TILE },
    { ...EMPTY_LIFESTYLE_TILE },
    { ...EMPTY_LIFESTYLE_TILE },
    { ...EMPTY_LIFESTYLE_TILE },
  ],
};

/** Catalog mosaic from the live homepage. Admin can replace every field. */
export const DEFAULT_LIFESTYLE_SHOP: LifestyleShopConfig = {
  banner: {
    imageUrl: "/gadget/gadget-lifestyle-flatlay.webp",
    eyebrow: "Curated for you",
    title: "Rethinking everyday tech",
    cta: "Shop now",
    href: "/products",
  },
  tiles: [
    {
      title: "For Everyday",
      href: "/products/smartwatch",
      imageUrl: "/gadget/products/prod-angle-smartwatch.webp",
    },
    {
      title: "For Adventure",
      href: "/products/power-bank",
      imageUrl: "/gadget/products/prod-powercore-30k-max.webp",
    },
    {
      title: "For Productivity",
      href: "/products/power-bank",
      imageUrl: "/gadget/products/prod-slim-10k.webp",
    },
    {
      title: "For Focus",
      href: "/products/earbuds",
      imageUrl: "/gadget/products/prod-studio-max.webp",
    },
  ],
};

function cloneLifestyleShop(shop: LifestyleShopConfig): LifestyleShopConfig {
  return {
    banner: { ...shop.banner },
    tiles: shop.tiles.map((tile) => ({ ...tile })),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tileFrom(raw: unknown): LifestyleShopTile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LIFESTYLE_TILE };
  const row = raw as Record<string, unknown>;
  return {
    title: text(row.title),
    href: text(row.href),
    imageUrl: text(row.imageUrl) || text(row.image_url),
  };
}

function bannerFrom(raw: unknown): LifestyleShopBanner {
  if (!raw || typeof raw !== "object") return { ...EMPTY_BANNER };
  const row = raw as Record<string, unknown>;
  return {
    imageUrl: text(row.imageUrl) || text(row.image_url),
    eyebrow: text(row.eyebrow),
    title: text(row.title),
    cta: text(row.cta),
    href: text(row.href),
  };
}

function parseLifestyleShop(raw: unknown): LifestyleShopConfig {
  if (!raw || typeof raw !== "object") {
    return cloneLifestyleShop(EMPTY_LIFESTYLE_SHOP);
  }
  const row = raw as Record<string, unknown>;
  const incoming = Array.isArray(row.tiles) ? row.tiles.map(tileFrom) : [];
  const tiles = EMPTY_LIFESTYLE_SHOP.tiles.map((_, index) => incoming[index] ?? { ...EMPTY_LIFESTYLE_TILE });
  return {
    banner: bannerFrom(row.banner),
    tiles,
  };
}

export function visibleLifestyleTiles(shop: LifestyleShopConfig): LifestyleShopTile[] {
  return shop.tiles.filter((tile) => tile.title && tile.imageUrl && tile.href);
}

export function lifestyleShopHasContent(shop: LifestyleShopConfig): boolean {
  const banner = shop.banner;
  const hasBanner = Boolean(banner.imageUrl || banner.title);
  return hasBanner || visibleLifestyleTiles(shop).length > 0;
}

export function normalizeLifestyleShop(raw: unknown): LifestyleShopConfig {
  const parsed = parseLifestyleShop(raw);
  if (!lifestyleShopHasContent(parsed)) {
    return cloneLifestyleShop(DEFAULT_LIFESTYLE_SHOP);
  }
  return parsed;
}

function placeLifestyleAboveReviews(ids: HomeSectionId[]): HomeSectionId[] {
  const without = ids.filter((id) => id !== "lifestyle");
  const reviewsAt = without.indexOf("reviews");
  if (reviewsAt === -1) return [...without, "lifestyle"];
  return [...without.slice(0, reviewsAt), "lifestyle", ...without.slice(reviewsAt)];
}

export function homeLayoutIdsForLifestyle(
  sections: HomeSectionEntry[],
  shop: LifestyleShopConfig
): HomeSectionId[] {
  const ids = enabledHomeSectionIds(sections);
  if (!lifestyleShopHasContent(shop)) {
    return ids.filter((id) => id !== "lifestyle");
  }
  if (!ids.includes("lifestyle")) return ids;
  if (ids[0] === "lifestyle") return placeLifestyleAboveReviews(ids);
  return ids;
}
