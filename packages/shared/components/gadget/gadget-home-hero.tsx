import { preload } from "react-dom";

import { fetchHeroSlides } from "@/lib/db/store";
import { gadgetDemoHeroBanners } from "@/lib/gadget-creatives";
import { heroLcpImageUrl } from "@/lib/gadget-hero-lcp";
import { fallbackHeroBanners, heroSlidesToBanners } from "@/lib/gadget-hero-banners";
import { products2Href } from "@/lib/gadget-preview";

import { GadgetHeroSlider } from "./gadget-hero-slider";

export function GadgetHomeHeroFallback() {
  return (
    <section
      className="bg-black"
      aria-busy="true"
      aria-label="Loading campaign banners"
    >
      <div className="gadget-hero-shell overflow-hidden bg-[var(--g-forest)]">
        <div className="relative h-[72svh] min-h-[520px] max-h-[860px] w-full bg-[var(--g-forest)] sm:h-[76svh]" />
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

  if (slides.length > 0 && slides[0]) {
    const lcpMobile = heroLcpImageUrl(slides[0], { mobile: true, quality: 70 });
    if (lcpMobile) {
      preload(lcpMobile, { as: "image", fetchPriority: "high" });
    }
  } else {
    preload("/gadget/gadget-hero-audio-mobile.webp", {
      as: "image",
      fetchPriority: "high",
    });
  }

  const banners =
    slides.length > 0
      ? heroSlidesToBanners(slides)
      : fallbackHeroBanners(gadgetDemoHeroBanners(products2Href));

  return (
    <>
      <GadgetHeroSlider banners={banners} />
    </>
  );
}
