"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

import { useGadgetPdpVariantImage } from "@/components/gadget/gadget-pdp-variant-context";
import type { PdpClientProduct } from "@/lib/pdp-client-payload";
import type { Product } from "@/lib/types";

const ProductGallery = dynamic(
  () =>
    import("@/components/product/product-gallery").then(
      (m) => m.ProductGallery,
    ),
  { ssr: false, loading: () => null },
);

/**
 * Server LCP hero first, then full interactive gallery in normal flow.
 * Defers ProductGallery (embla, radix dialog, touch listeners) until user interaction or idle.
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
    const onInteract = () => setShowGallery(true);
    window.addEventListener("pointerdown", onInteract, { once: true, passive: true });
    window.addEventListener("touchstart", onInteract, { once: true, passive: true });
    window.addEventListener("keydown", onInteract, { once: true, passive: true });
    const timer = setTimeout(() => setShowGallery(true), 6500);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("touchstart", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  if (showGallery) {
    return (
      <ProductGallery
        product={product as Product}
        variantImage={variantImage ?? undefined}
      />
    );
  }

  return <>{lcpHero}</>;
}
