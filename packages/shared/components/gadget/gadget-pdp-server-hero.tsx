import { pdpLcpImageUrl } from "@/lib/gadget-pdp-lcp";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Server-rendered LCP candidate — structure perfectly mirrors ProductGallery to eliminate CLS. */
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

  const thumbCount =
    (product.cloudinaryImages?.length ?? 0) + (product.images?.length ?? 0);
  const showThumbs = thumbCount > 1;

  return (
    <div className="space-y-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-[var(--g-cream-deep,#f5f5f5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={product.name}
          width={640}
          height={640}
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        />
      </div>
      {showThumbs && (
        <div
          className="grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3"
          aria-hidden
        >
          {Array.from({ length: Math.min(thumbCount, 4) }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "aspect-square rounded-lg border bg-muted/60",
                i === 0 && "ring-2 ring-primary/40 border-primary"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
