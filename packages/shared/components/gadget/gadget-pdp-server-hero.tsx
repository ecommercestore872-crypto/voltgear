import Image from "next/image";

import { PDP_HERO_SIZES, pdpGalleryThumbCount, pdpLcpImageUrl } from "@/lib/gadget-pdp-lcp";
import type { Product } from "@/lib/types";

/** Server-rendered LCP candidate — replaced by interactive gallery after hydration. */
export function GadgetPdpServerHero({ product }: { product: Product }) {
  const src = pdpLcpImageUrl(product);
  const thumbs = pdpGalleryThumbCount(product);
  if (!src) {
    return (
      <div
        className="aspect-square w-full rounded-xl bg-[var(--g-cream-deep)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--g-white)]">
        <Image
          src={src}
          alt={product.name}
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes={PDP_HERO_SIZES}
          className="object-contain"
        />
      </div>
      {/* Reserves the gallery's thumbnail rows so the buy box does not jump when it mounts. */}
      {thumbs ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3" aria-hidden>
          {Array.from({ length: thumbs }, (_, i) => (
            <div key={i} className="aspect-square" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
