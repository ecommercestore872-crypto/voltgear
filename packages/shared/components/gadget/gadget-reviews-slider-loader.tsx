"use client";

import dynamic from "next/dynamic";

export const GadgetReviewsSlider = dynamic(
  () => import("./gadget-reviews-slider").then((module) => module.GadgetReviewsSlider),
  { ssr: false, loading: () => null },
);
