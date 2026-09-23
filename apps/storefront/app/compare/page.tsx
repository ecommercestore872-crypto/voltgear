"use client";

import dynamic from "next/dynamic";

const ComparePage = dynamic(
  () =>
    import("@/components/product/product-comparison").then(
      (m) => m.ComparePage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="container mx-auto px-4 py-12 text-center lg:px-8">
        <p className="text-muted-foreground">Loading comparison...</p>
      </div>
    ),
  },
);

export default function CompareRoute() {
  return <ComparePage />;
}
