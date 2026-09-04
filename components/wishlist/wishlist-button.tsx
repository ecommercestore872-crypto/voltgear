"use client";

import { Heart } from "lucide-react";

import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function WishlistButton({ product }: { product: Product }) {
  const { hasItem, toggleItem } = useWishlist();
  const active = hasItem(product.slug);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem({
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images?.[0] ? imageUrl(product.images[0], { w: 128 }) : undefined,
          category: product.category,
        });
      }}
      className={cn(
        "absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--g-line)] shadow-none backdrop-blur-sm transition-colors",
        active
          ? "bg-[var(--g-forest)] text-[var(--g-cream)]"
          : "bg-[var(--g-cream)]/90 text-[var(--g-charcoal)] hover:bg-[var(--g-white)]"
      )}
      aria-label={active ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
    </button>
  );
}
