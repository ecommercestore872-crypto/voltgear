import type { Product } from "@/lib/types";

const BASE = "/gadget/products";

const CATEGORY_ANGLE: Record<string, string> = {
  charger: `${BASE}/prod-angle-charger.webp`,
  earbuds: `${BASE}/prod-angle-earbuds.webp`,
  "power-bank": `${BASE}/prod-angle-power-bank.webp`,
  smartwatch: `${BASE}/prod-angle-smartwatch.webp`,
};

/** Primary studio hero per published catalog slug (gadget preview only). */
const SLUG_PRIMARY: Record<string, string> = {
  "car-45w-charger": `${BASE}/prod-car-45w-charger.webp`,
  "dual-20w-charger": `${BASE}/prod-dual-20w-charger.webp`,
  "gan-65w-charger": `${BASE}/prod-gan-65w-charger.webp`,
  "wireless-15w-pad": `${BASE}/prod-wireless-15w-pad.webp`,
  "mini-buds": `${BASE}/prod-mini-buds.webp`,
  "sport-flex": `${BASE}/prod-sport-flex.webp`,
  "studio-max": `${BASE}/prod-studio-max.webp`,
  "pocket-5k": `${BASE}/prod-pocket-5k.webp`,
  "powercore-20k": `${BASE}/prod-powercore-20k.webp`,
  "powercore-30k-max": `${BASE}/prod-powercore-30k-max.webp`,
  "slim-10k": `${BASE}/prod-slim-10k.webp`,
  "voltgear-kids-k1": `${BASE}/prod-voltgear-kids-k1.webp`,
  "voltgear-lite-s1": `${BASE}/prod-voltgear-lite-s1.webp`,
  "voltgear-pro-s2": `${BASE}/prod-voltgear-pro-s2.webp`,
  "voltgear-ultra-x": `${BASE}/prod-voltgear-ultra-x.webp`,
};

export function gadgetStudioImagesFor(
  slug: string,
  category: string
): string[] | null {
  const primary = SLUG_PRIMARY[slug];
  if (!primary) return null;
  const angle = CATEGORY_ANGLE[category];
  return angle && angle !== primary ? [primary, angle] : [primary];
}

/**
 * Preview-only: swap DB/Cloudinary photos for local studio creatives so the
 * gadget client demo looks production-ready without mutating live catalog data.
 */
export function applyGadgetStudioImages<T extends Product>(product: T): T {
  const studio = gadgetStudioImagesFor(product.slug, product.category);
  if (!studio?.length) return product;
  return {
    ...product,
    images: studio,
    cloudinaryImages: [],
  };
}

export function applyGadgetStudioImagesList<T extends Product>(products: T[]): T[] {
  return products.map(applyGadgetStudioImages);
}
