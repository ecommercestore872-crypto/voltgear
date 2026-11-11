"use client";

import dynamic from "next/dynamic";
import { DeferredUntilIdle } from "@/components/ui/deferred-until-idle";
import type { BlogCardPost } from "./gadget-blog-section";
import type { LifestyleShopConfig } from "@/lib/db/lifestyle-shop-rules";
import type { Testimonial } from "@/lib/types";

const GadgetReviewsSlider = dynamic(
  () =>
    import("@/components/gadget/gadget-reviews-slider").then(
      (m) => m.GadgetReviewsSlider,
    ),
  { ssr: false, loading: () => null },
);

const GadgetBlogSection = dynamic(
  () =>
    import("@/components/gadget/gadget-blog-section").then(
      (m) => m.GadgetBlogSection,
    ),
  { ssr: false, loading: () => null },
);

const GadgetLifestyleShop = dynamic(
  () =>
    import("@/components/gadget/gadget-lifestyle-shop").then(
      (m) => m.GadgetLifestyleShop,
    ),
  { ssr: false, loading: () => null },
);

export function DeferredReviewsSection({
  reviews,
}: {
  reviews: Testimonial[];
}) {
  return (
    <DeferredUntilIdle>
      <GadgetReviewsSlider reviews={reviews} />
    </DeferredUntilIdle>
  );
}

export function DeferredBlogSection({
  popularCards,
  latestCards,
}: {
  popularCards: BlogCardPost[];
  latestCards: BlogCardPost[];
}) {
  return (
    <DeferredUntilIdle>
      <GadgetBlogSection
        popularCards={popularCards}
        latestCards={latestCards}
      />
    </DeferredUntilIdle>
  );
}

export function DeferredLifestyleSection({
  shop,
}: {
  shop: LifestyleShopConfig;
}) {
  return (
    <DeferredUntilIdle>
      <GadgetLifestyleShop shop={shop} />
    </DeferredUntilIdle>
  );
}
