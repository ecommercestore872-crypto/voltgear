"use client";

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import { GadgetPdpVariantHero } from "@/components/gadget/gadget-pdp-variant-hero";
import { useGadgetPdpVariantImage } from "@/components/gadget/gadget-pdp-variant-context";
import type { PdpClientProduct } from "@/lib/pdp-client-payload";
import type { Product } from "@/lib/types";

// Own chunk (lightbox + radix dialog): the server hero is the LCP, so this loads after first paint.
// Suspense keeps the hero on screen while the chunk loads, so the buy box never jumps.
const ProductGallery = lazy(() =>
  import("@/components/product/product-gallery").then((m) => ({ default: m.ProductGallery })),
);

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
      <Suspense fallback={lcpHero}>
        <ProductGallery
          product={product as Product}
          variantImage={variantImage ?? undefined}
        />
      </Suspense>
    );
  }

  if (variantImage) {
    return <GadgetPdpVariantHero image={variantImage} />;
  }

  return <>{lcpHero}</>;
}
