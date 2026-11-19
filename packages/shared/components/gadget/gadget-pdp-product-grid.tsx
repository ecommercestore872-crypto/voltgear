"use client";

import type { ReactNode } from "react";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetPdpMediaColumn } from "@/components/gadget/gadget-pdp-media-column";
import { GadgetPdpVariantProvider } from "@/components/gadget/gadget-pdp-variant-context";
import type { PdpClientProduct } from "@/lib/pdp-client-payload";
import type { ApprovedReviewStats } from "@/lib/product-review-stats";
import type { PublicSiteConfig } from "@/lib/site-config";

function GadgetPdpProductGridInner({
  product,
  config,
  reviewStats,
  lcpHero,
}: {
  product: PdpClientProduct;
  config: PublicSiteConfig;
  reviewStats: ApprovedReviewStats;
  lcpHero: ReactNode;
}) {
  return (
    <div className="grid gap-6 rounded-[1.75rem] bg-white p-3 sm:p-5 md:grid-cols-2 md:items-start md:gap-8 md:p-8 lg:gap-14 lg:p-10">
      <div className="mx-auto w-full max-w-md overflow-x-hidden rounded-2xl sm:max-w-lg md:max-w-none">
        <GadgetPdpMediaColumn product={product} lcpHero={lcpHero} />
      </div>
      <GadgetBuyBox
        product={product}
        config={config}
        reviewStats={reviewStats}
        infoOnly
        syncGalleryVariant
      />
    </div>
  );
}

export function GadgetPdpProductGrid({
  product,
  config,
  reviewStats,
  lcpHero,
}: {
  product: PdpClientProduct;
  config: PublicSiteConfig;
  reviewStats: ApprovedReviewStats;
  lcpHero: ReactNode;
}) {
  return (
    <GadgetPdpVariantProvider>
      <GadgetPdpProductGridInner
        product={product}
        config={config}
        reviewStats={reviewStats}
        lcpHero={lcpHero}
      />
    </GadgetPdpVariantProvider>
  );
}
