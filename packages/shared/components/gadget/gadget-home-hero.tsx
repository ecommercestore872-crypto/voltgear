import { preload } from "react-dom";

import { fetchHeroSlides } from "@/lib/db/store";
import { gadgetDemoHeroBanners } from "@/lib/gadget-creatives";
import { heroLcpImageUrl } from "@/lib/gadget-hero-lcp";
import { products2Href } from "@/lib/gadget-preview";

import { GadgetHeroSlider } from "./gadget-hero-slider";

export function GadgetHomeHeroFallback() {
  return (
    <section
      className="bg-[var(--g-cream)] px-3 pt-3 pb-2 sm:px-4 sm:pt-4 lg:px-8"
      aria-busy="true"
      aria-label="Loading campaign banners"
    >
      <div className="gadget-hero-shell mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-[var(--g-line)] bg-[var(--g-forest)]">
        <div className="relative w-full min-h-[320px] aspect-square animate-pulse bg-[var(--g-forest)] sm:min-h-0 sm:aspect-[21/9] lg:aspect-[2.4/1]" />
      </div>
    </section>
  );
}

/** Hero only — streams before heavy homepage catalog queries. */
export async function GadgetHomeHero() {
  const demo = false;
  let slides: Awaited<ReturnType<typeof fetchHeroSlides>> = [];
  try {
    slides = await fetchHeroSlides(demo);
  } catch {
    slides = [];
  }

  const lcpMobile =
    slides[0] != null ? heroLcpImageUrl(slides[0], { mobile: true }) : "";
  const lcpDesktop =
    slides[0] != null ? heroLcpImageUrl(slides[0], { mobile: false }) : "";
  if (lcpMobile) {
    preload(lcpMobile, { as: "image", fetchPriority: "high" });
  }
  if (lcpDesktop && lcpDesktop !== lcpMobile) {
    preload(lcpDesktop, { as: "image", fetchPriority: "low" });
  }

  return (
    <>
      <GadgetHeroSlider
        slides={slides}
        fallbackBanners={gadgetDemoHeroBanners(products2Href)}
      />
    </>
  );
}
