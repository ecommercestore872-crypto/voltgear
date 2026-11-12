import { resolveSlideCta } from "@/lib/db/hero-slide-rules";
import type { GadgetCreativeBanner } from "@/lib/gadget-creatives";
import { product2Href } from "@/lib/gadget-preview";
import type { HeroSlide } from "@/lib/types";

export type GadgetHeroBanner = {
  id: string;
  title?: string;
  subtitle?: string | null;
  eyebrow?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  href: string;
  ctaDisabled?: boolean;
  ctaLabel?: string;
  artworkText?: boolean;
  textOnly?: boolean;
};

// These published Cloudinary assets contain an unverified customer-count claim.
// Use the slide's existing copy with a brand-color background until both assets
// are replaced in Admin. Matching the asset IDs lets new artwork display normally.
const CLAIMED_HERO_ASSET_IDS = ["stm72jeeup4qg0rcwrh9", "z0kxjmp7dmyfv9lfaytc"];

export function hasClaimedHeroArtwork(slide: Pick<HeroSlide, "imageUrl" | "subtitle">): boolean {
  return CLAIMED_HERO_ASSET_IDS.some((id) =>
    slide.imageUrl.includes(id) || (slide.subtitle ?? "").includes(id),
  );
}

export function heroSlidesToBanners(slides: HeroSlide[]): GadgetHeroBanner[] {
  return slides.map((slide) => {
    const textOnly = hasClaimedHeroArtwork(slide);
    const cta = resolveSlideCta(slide.product.stockStatus);
    let subtitle = slide.subtitle;
    let ctaLabel = "Shop " + (slide.title || "this offer");
    let mobileImageUrl = "";
    let href = product2Href(slide.product.slug);
    let artworkText = false;

    if (subtitle && subtitle.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(subtitle) as {
          text?: string;
          cta?: string;
          mobile?: string;
          linkType?: string;
          category?: string;
          artworkText?: boolean;
        };
        subtitle = parsed.text || "";
        if (parsed.cta) {
          ctaLabel = parsed.cta;
        }
        if (parsed.mobile) {
          mobileImageUrl = parsed.mobile;
        }
        artworkText = parsed.artworkText === true;
        if (parsed.linkType === "all") {
          href = "/products";
        } else if (parsed.linkType === "category" && parsed.category) {
          href = `/products?category=${parsed.category}`;
        } else if (parsed.linkType === "none") {
          href = "";
        }
      } catch {
        // plain subtitle string
      }
    }

    return {
      id: slide.id,
      title: slide.title,
      subtitle,
      imageUrl: textOnly ? "" : slide.imageUrl,
      mobileImageUrl: textOnly ? "" : mobileImageUrl,
      href,
      ctaDisabled: cta.disabled,
      ctaLabel: textOnly && !cta.disabled ? "Shop products" : ctaLabel === "Shop this offer" ? "" : ctaLabel,
      artworkText: textOnly ? false : artworkText,
      textOnly,
    };
  });
}

export function fallbackHeroBanners(
  fallbackBanners: GadgetCreativeBanner[],
): GadgetHeroBanner[] {
  return fallbackBanners.map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    subtitle: b.subtitle,
    eyebrow: b.eyebrow,
    href: b.href,
    ctaLabel: b.ctaLabel || "Shop the collection",
  }));
}
