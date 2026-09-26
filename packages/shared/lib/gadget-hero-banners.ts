import { resolveSlideCta } from "@/lib/db/hero-slide-rules";
import type { GadgetCreativeBanner } from "@/lib/gadget-creatives";
import { product2Href } from "@/lib/gadget-preview";
import type { HeroSlide } from "@/lib/types";

export type GadgetHeroBanner = {
  id: string;
  title?: string;
  subtitle?: string | null;
  imageUrl: string;
  mobileImageUrl?: string;
  href: string;
  ctaDisabled?: boolean;
  ctaLabel?: string;
};

export function heroSlidesToBanners(slides: HeroSlide[]): GadgetHeroBanner[] {
  return slides.map((slide) => {
    const cta = resolveSlideCta(slide.product.stockStatus);
    let subtitle = slide.subtitle;
    let ctaLabel = "Shop " + (slide.title || "this offer");
    let mobileImageUrl = "";
    let href = product2Href(slide.product.slug);

    if (subtitle && subtitle.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(subtitle) as {
          text?: string;
          cta?: string;
          mobile?: string;
          linkType?: string;
          category?: string;
        };
        subtitle = parsed.text || "";
        if (parsed.cta) {
          ctaLabel = parsed.cta;
        }
        if (parsed.mobile) {
          mobileImageUrl = parsed.mobile;
        }
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
      imageUrl: slide.imageUrl,
      mobileImageUrl,
      href,
      ctaDisabled: cta.disabled,
      ctaLabel: ctaLabel === "Shop this offer" ? "" : ctaLabel,
    };
  });
}

export function fallbackHeroBanners(
  fallbackBanners: GadgetCreativeBanner[],
): GadgetHeroBanner[] {
  return fallbackBanners.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: undefined,
    imageUrl: b.imageUrl,
    href: b.href,
    ctaLabel: "Shop this offer",
  }));
}
