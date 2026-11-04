/**
 * Demo / fallback campaign assets for the gadget (Biometic) preview storefront.
 * Prefer Admin → Hero published slides in production; these fill gaps for client demos.
 */

export const GADGET_CREATIVES = {
  heroCampaignPreview: "/gadget/gadget-hero-campaign-preview.webp",
  heroCampaignPreviewMobile: "/gadget/gadget-hero-campaign-preview-mobile.webp",
  heroAudio: "/gadget/gadget-hero-audio.webp",
  heroAudioMobile: "/gadget/gadget-hero-audio-mobile.webp",
  heroPower: "/gadget/gadget-hero-power.webp",
  heroPowerMobile: "/gadget/gadget-hero-power-mobile.webp",
  heroWatch: "/gadget/gadget-hero-watch.webp",
  heroWatchMobile: "/gadget/gadget-hero-watch-mobile.webp",
  lifestyleFlatlay: "/gadget/gadget-lifestyle-flatlay.webp",
  promoAtmosphere: "/gadget/gadget-promo-atmosphere.webp",
} as const;

export type GadgetCreativeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  ctaLabel?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  href: string;
};

/** Campaign carousels when Admin has no published hero slides. */
export function gadgetDemoHeroBanners(categoryHref: (slug: string) => string): GadgetCreativeBanner[] {
  return [
    {
      id: "demo-hero-campaign-preview",
      title: "More than gadgets.",
      subtitle: "Discover useful tech for the way you live.",
      eyebrow: "Campaign concept · illustrative products",
      ctaLabel: "Shop now",
      imageUrl: GADGET_CREATIVES.heroCampaignPreview,
      mobileImageUrl: GADGET_CREATIVES.heroCampaignPreviewMobile,
      href: categoryHref(""),
    },
    {
      id: "demo-hero-audio",
      title: "Sound that goes everywhere.",
      subtitle: "Explore earbuds and audio for the moments that move you.",
      imageUrl: GADGET_CREATIVES.heroAudio,
      mobileImageUrl: GADGET_CREATIVES.heroAudioMobile,
      href: categoryHref("earbuds"),
    },
    {
      id: "demo-hero-power",
      title: "Power your everyday.",
      subtitle: "Find power banks and chargers for your routine.",
      imageUrl: GADGET_CREATIVES.heroPower,
      mobileImageUrl: GADGET_CREATIVES.heroPowerMobile,
      href: categoryHref("power-bank"),
    },
    {
      id: "demo-hero-watch",
      title: "Smart essentials, thoughtfully chosen.",
      subtitle: "Browse smartwatches and everyday accessories.",
      imageUrl: GADGET_CREATIVES.heroWatch,
      mobileImageUrl: GADGET_CREATIVES.heroWatchMobile,
      href: categoryHref("smartwatch"),
    },
  ];
}

export function gadgetLifestyleFeatureImage(fallbackSlideUrl?: string | null) {
  const fromAdmin = (fallbackSlideUrl ?? "").trim();
  if (fromAdmin) return fromAdmin;
  return GADGET_CREATIVES.lifestyleFlatlay;
}
