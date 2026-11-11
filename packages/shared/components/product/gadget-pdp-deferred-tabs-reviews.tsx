"use client";

import dynamic from "next/dynamic";
import { DeferredUntilIdle } from "@/components/ui/deferred-until-idle";
import type { Product } from "@/lib/types";

const GadgetProductTabs = dynamic(
  () =>
    import("@/components/gadget/gadget-product-tabs").then(
      (m) => m.GadgetProductTabs,
    ),
  { ssr: false, loading: () => null },
);

const ReviewsSection = dynamic(
  () =>
    import("@/components/product/product-info-sections").then(
      (m) => m.ReviewsSection,
    ),
  { ssr: false, loading: () => null },
);

export function PdpDeferredTabsReviews({
  product,
  rating,
}: {
  product: Product;
  rating?: number;
}) {
  return (
    <>
      <div className="mt-10 scroll-mt-24">
        <DeferredUntilIdle timeoutMs={30000}>
          <GadgetProductTabs product={product} />
        </DeferredUntilIdle>
      </div>
      <div className="mt-12 scroll-mt-24">
        <DeferredUntilIdle timeoutMs={30000}>
          <ReviewsSection
            product={product}
            reviews={product.reviews ?? []}
            rating={rating}
            includeDemo={false}
          />
        </DeferredUntilIdle>
      </div>
    </>
  );
}
