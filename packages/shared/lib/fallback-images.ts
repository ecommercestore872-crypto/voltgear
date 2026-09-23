import type { Product } from "@/lib/types";

export function getFallbackProductImage(product?: Product | null): string {
  if (!product) return "/images/website-test-creatives/smart_watch_1_1788035413288.png";
  if (product.category === "smartwatch") return "/images/website-test-creatives/smart_watch_1_1788035413288.png";
  if (product.category === "power-bank") return "/images/website-test-creatives/power_bank_1_1788035447549.png";
  if (product.category === "earbuds") return "/images/website-test-creatives/headphones_1_1788036766501.png";
  if (product.category === "charger") return "/images/website-test-creatives/adapters_1_1788036789653.png";
  return "/images/website-test-creatives/smart_watch_1_1788035413288.png";
}

export function getFallbackHeroImages(): string[] {
  return [
    "/images/website-test-creatives/hero_section_1_1788035364374.png",
    "/images/website-test-creatives/hero_section_2_1788035379367.png",
    "/images/website-test-creatives/hero_section_3_1788035394507.png",
  ];
}
