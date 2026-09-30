"use client";

import type { ReactNode } from "react";

import { GadgetBuyBox } from "@/components/gadget/gadget-buy-box";
import { GadgetPdpGalleryClient } from "@/components/gadget/gadget-pdp-gallery-client";
import { GadgetPdpVariantProvider } from "@/components/gadget/gadget-pdp-variant-context";
import { useGadgetPdpVariantImage } from "@/components/gadget/gadget-pdp-variant-context";
import type { PublicSiteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";

function GadgetPdpProductGridInner({
  product,
  config,
  lcpHero,
}: {
  product: Product;
  config: PublicSiteConfig;
  lcpHero: ReactNode;
}) {
  const { variantImage } = useGadgetPdpVariantImage();

  return (
    <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-8 lg:gap-12">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3 sm:max-w-lg md:max-w-none md:p-3 lg:p-4">
        <div className="relative">
          {!variantImage ? lcpHero : null}
          <GadgetPdpGalleryClient product={product} variantImage={variantImage} />
        </div>
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
  product: Product;
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
