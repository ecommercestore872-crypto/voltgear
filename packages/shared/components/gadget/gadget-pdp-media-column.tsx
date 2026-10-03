"use client";

import { useEffect, useState, type ReactNode } from "react";

import { GadgetPdpVariantHero } from "@/components/gadget/gadget-pdp-variant-hero";
import { useGadgetPdpVariantImage } from "@/components/gadget/gadget-pdp-variant-context";
import { ProductGallery } from "@/components/product/product-gallery";
import type { PdpClientProduct } from "@/lib/pdp-client-payload";
import type { Product } from "@/lib/types";

/**
 * Server LCP hero first, then full gallery (main + thumbnails) in normal flow —
 * avoids clipping thumbs inside an absolute overlay.
 */
export function GadgetPdpMediaColumn({
  product,
  lcpHero,
}: {
  product: PdpClientProduct;
  lcpHero: ReactNode;
}) {
  const { variantImage } = useGadgetPdpVariantImage();
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) {
      const id = window.requestAnimationFrame(() => setShowGallery(true));
      return () => window.cancelAnimationFrame(id);
    }
    const id = window.requestAnimationFrame(() => setShowGallery(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (variantImage?.src) setShowGallery(true);
  }, [variantImage?.src]);

  if (showGallery) {
    return (
      <ProductGallery
        product={product as Product}
        variantImage={variantImage ?? undefined}
      />
    );
  }

  if (variantImage) {
    return <GadgetPdpVariantHero image={variantImage} />;
  }

  return <>{lcpHero}</>;
}
