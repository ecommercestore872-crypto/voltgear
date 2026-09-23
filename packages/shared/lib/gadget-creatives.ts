/**
 * Demo / fallback campaign assets for the gadget (Biometic) preview storefront.
 * Prefer Admin → Hero published slides in production; these fill gaps for client demos.
 */

export const GADGET_CREATIVES = {
  heroAudio: "/gadget/gadget-hero-audio.webp",
  heroPower: "/gadget/gadget-hero-power.webp",
  heroWatch: "/gadget/gadget-hero-watch.webp",
  lifestyleFlatlay: "/gadget/gadget-lifestyle-flatlay.webp",
  promoAtmosphere: "/gadget/gadget-promo-atmosphere.webp",
} as const;

export type GadgetCreativeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  href: string;
};

/** Campaign carousels when Admin has no published hero slides. */
export function gadgetDemoHeroBanners(categoryHref: (slug: string) => string): GadgetCreativeBanner[] {
  return [
    {
      id: "demo-hero-audio",
      title: "Sound that stays with you",
      subtitle: "Everyday audio, curated",
      imageUrl: GADGET_CREATIVES.heroAudio,
      href: categoryHref("earbuds"),
    },
    {
      id: "demo-hero-power",
      title: "Power when you need it",
      subtitle: "Banks & chargers ready to ship",
      imageUrl: GADGET_CREATIVES.heroPower,
      href: categoryHref("power-bank"),
    },
    {
      id: "demo-hero-watch",
      title: "Wearable clarity",
      subtitle: "Watches for the day ahead",
      imageUrl: GADGET_CREATIVES.heroWatch,
      href: categoryHref("smartwatch"),
    },
  ];
}

export function gadgetLifestyleFeatureImage(fallbackSlideUrl?: string | null) {
  const fromAdmin = (fallbackSlideUrl ?? "").trim();
  if (fromAdmin) return fromAdmin;
  return GADGET_CREATIVES.lifestyleFlatlay;
}
