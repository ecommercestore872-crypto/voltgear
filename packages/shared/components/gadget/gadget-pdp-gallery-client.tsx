"use client";

import { useEffect, useState } from "react";

import type { PdpGalleryVariantImage } from "@/components/gadget/gadget-pdp-variant-context";
import { ProductGallery } from "@/components/product/product-gallery";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Interactive gallery; mounts after first paint so server hero stays LCP. */
export function GadgetPdpGalleryClient({
  product,
  variantImage,
}: {
  product: Product;
  variantImage?: PdpGalleryVariantImage | null;
}) {
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setInteractive(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (variantImage?.src) setInteractive(true);
  }, [variantImage?.src]);

  if (!interactive) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[1] rounded-xl bg-[var(--g-white)]",
        "animate-in fade-in duration-200",
      )}
    >
      <ProductGallery product={product} variantImage={variantImage ?? undefined} />
    </div>
  );
}
