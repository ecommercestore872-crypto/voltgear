"use client";

import dynamic from "next/dynamic";

export const ProductViewTrackerLoader = dynamic(
  () =>
    import("@/components/product/product-view-tracker").then(
      (module) => module.ProductViewTracker,
    ),
  { ssr: false, loading: () => null },
);
