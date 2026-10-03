import Image from "next/image";

import { pdpLcpImageUrl } from "@/lib/gadget-pdp-lcp";
import type { Product } from "@/lib/types";

/** Server-rendered LCP candidate — replaced by interactive gallery after hydration. */
export function GadgetPdpServerHero({ product }: { product: Product }) {
  const src = pdpLcpImageUrl(product);
  if (!src) {
    return (
      <div
        className="aspect-square w-full rounded-xl bg-[var(--g-cream-deep)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--g-white)]">
      <Image
        src={src}
        alt={product.name}
        fill
        priority
        fetchPriority="high"
        quality={68}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain"
      />
    </div>
  );
}
