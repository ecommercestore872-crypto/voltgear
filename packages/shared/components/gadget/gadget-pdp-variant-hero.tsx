"use client";

import Image from "next/image";

import type { PdpGalleryVariantImage } from "@/components/gadget/gadget-pdp-variant-context";

/** Instant variant swap before / beside the interactive gallery mounts. */
export function GadgetPdpVariantHero({
  image,
}: {
  image: PdpGalleryVariantImage;
}) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[var(--g-white)]">
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        quality={62}
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-contain"
      />
    </div>
  );
}
