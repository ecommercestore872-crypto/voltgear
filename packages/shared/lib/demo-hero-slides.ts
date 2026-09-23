import type { HeroSection, Product, StoreImage } from "@/lib/types";

export interface HeroSlide {
  id: string;
  image?: StoreImage | string;
  alt: string;
  headline?: string;
  subheadline?: string;
  primaryCta?: { label?: string; href?: string };
  secondaryCta?: { label?: string; href?: string };
  featuredProduct?: Product;
}

import { getFallbackHeroImages } from "@/lib/fallback-images";

export function getHeroSlides(
  realHero: HeroSection | null,
  products: Product[] = []
): HeroSlide[] {
  const slides: HeroSlide[] = [];

  // Prioritize local generated creatives for the storefront experience
  let realImages = getFallbackHeroImages();
  
  if (!realImages || realImages.length === 0) {
    realImages = realHero?.backgroundImages?.length
      ? realHero.backgroundImages
      : realHero?.backgroundImage
      ? [realHero.backgroundImage]
      : [];
  }

  const hasRealImages = realImages.length > 0;

  if (hasRealImages) {
    // We have images, either real or fallback
    const baseHero = realHero || {
      headline: "Move With Power.",
      subheadline: "Premium tech essentials for your daily lifestyle.",
      primaryCta: { label: "Shop Now", href: "/products" },
      secondaryCta: { label: "Explore Collection", href: "/categories" },
    };
    
    realImages.forEach((img, index) => {
      slides.push({
        id: `hero-slide-${index}`,
        image: img,
        headline: index === 0 ? baseHero.headline : undefined,
        subheadline: index === 0 ? baseHero.subheadline : undefined,
        primaryCta: baseHero.primaryCta,
        secondaryCta: index === 0 ? (baseHero as unknown as HeroSection).secondaryCta : undefined,
        featuredProduct: index === 0 ? (baseHero as unknown as HeroSection).featuredProduct : undefined,
        alt: `${baseHero.headline || "Hero Slide"} ${index + 1}`,
      });
    });
  } else if (realHero) {
    // Real hero without background images (text/featured product layout)
    slides.push({
      id: "real-hero-main",
      headline: realHero.headline,
      subheadline: realHero.subheadline,
      primaryCta: realHero.primaryCta,
      secondaryCta: realHero.secondaryCta,
      featuredProduct: realHero.featuredProduct,
      alt: realHero.headline || "VoltGear Hero",
    });
  }

  // Development/Local visual slider test mode ONLY:
  // If no admin images exist and we are in non-production, append safe demo slides
  if (!hasRealImages && process.env.NODE_ENV !== "production" && slides.length < 2) {
    const productsWithImages = products.filter(
      (p) => p.images?.[0] || p.cloudinaryImages?.[0]
    );

    productsWithImages.slice(0, 3).forEach((prod, index) => {
      const img = prod.images?.[0] || prod.cloudinaryImages?.[0];
      const slideId = `demo-slide-${prod._id || index}`;

      if (img && (!slides[0]?.image || slides[0].image !== img)) {
        slides.push({
          id: slideId,
          image: img,
          headline: prod.name,
          subheadline: prod.shortDescription || `Meet ${prod.name}.`,
          primaryCta: { label: "Shop Now", href: `/product/${prod.slug}` },
          secondaryCta: { label: "View Details", href: `/products/${prod.category}` },
          featuredProduct: prod,
          alt: prod.name,
        });
      }
    });
  }

  // Fallback if no slides exist at all
  if (slides.length === 0) {
    slides.push({
      id: "default-fallback-slide",
      headline: "Move With Power.",
      subheadline: "Premium tech essentials for your daily lifestyle.",
      primaryCta: { label: "Shop Now", href: "/products" },
      secondaryCta: { label: "Explore Collection", href: "/categories" },
      alt: "Move With Power",
    });
  }

  return slides;
}
