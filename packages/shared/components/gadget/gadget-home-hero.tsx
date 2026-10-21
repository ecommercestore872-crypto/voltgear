import { preload } from "react-dom";

import { fetchHeroSlides } from "@/lib/db/store";
import { gadgetDemoHeroBanners } from "@/lib/gadget-creatives";
import { heroLcpPreloads } from "@/lib/gadget-hero-lcp";
import { products2Href } from "@/lib/gadget-preview";

import { GadgetHeroSlider } from "./gadget-hero-slider";

/** Resolve the cached hero before the heavy homepage catalog streams. */
export async function GadgetHomeHero() {
  const demo = false;
  let slides: Awaited<ReturnType<typeof fetchHeroSlides>> = [];
  try {
    slides = await fetchHeroSlides(demo);
  } catch {
    slides = [];
  }

  if (slides[0]) {
    for (const image of heroLcpPreloads(slides[0])) {
      preload(image.href, {
        as: "image",
        fetchPriority: "high",
        imageSrcSet: image.imageSrcSet,
        imageSizes: image.imageSizes,
        media: image.media,
      });
    }
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
