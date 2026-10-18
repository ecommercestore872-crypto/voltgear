"use client";

import dynamic from "next/dynamic";

export const GadgetReviewsSliderLoader = dynamic(
  () =>
    import("@/components/gadget/gadget-reviews-slider").then(
      (module) => module.GadgetReviewsSlider,
    ),
  { loading: () => null, ssr: false },
);
