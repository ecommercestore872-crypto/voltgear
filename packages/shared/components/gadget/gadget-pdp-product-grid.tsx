"use client";

import type { ReactNode } from "react";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetPdpMediaColumn } from "@/components/gadget/gadget-pdp-media-column";
import { GadgetPdpVariantProvider } from "@/components/gadget/gadget-pdp-variant-context";
import type { PdpClientProduct } from "@/lib/pdp-client-payload";
import type { PublicSiteConfig } from "@/lib/site-config";

function GadgetPdpProductGridInner({
  product,
  config,
  lcpHero,
}: {
  product: PdpClientProduct;
  config: PublicSiteConfig;
  lcpHero: ReactNode;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-8 lg:gap-12">
      <div className="mx-auto w-full max-w-md overflow-x-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3 sm:max-w-lg md:max-w-none md:p-3 lg:p-4">
        <GadgetPdpMediaColumn product={product} lcpHero={lcpHero} />
      </div>
      <GadgetBuyBox product={product} config={config} infoOnly syncGalleryVariant />
    </div>
  );
}

export function GadgetPdpProductGrid({
  product,
  config,
  lcpHero,
}: {
  product: PdpClientProduct;
  config: PublicSiteConfig;
  lcpHero: ReactNode;
}) {
  return (
    <GadgetPdpVariantProvider>
      <GadgetPdpProductGridInner
        product={product}
        config={config}
        lcpHero={lcpHero}
      />
    </GadgetPdpVariantProvider>
  );
}
