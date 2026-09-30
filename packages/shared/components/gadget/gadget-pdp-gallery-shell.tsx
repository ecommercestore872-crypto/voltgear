import { GadgetPdpGalleryClient } from "@/components/gadget/gadget-pdp-gallery-client";
import { GadgetPdpServerHero } from "@/components/gadget/gadget-pdp-server-hero";
import type { Product } from "@/lib/types";

export function GadgetPdpGalleryShell({ product }: { product: Product }) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3 sm:max-w-lg md:max-w-none md:p-3 lg:p-4">
      <div className="relative">
        <GadgetPdpServerHero product={product} />
        <GadgetPdpGalleryClient product={product} />
      </div>
    </div>
  );
}
