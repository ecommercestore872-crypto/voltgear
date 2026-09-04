"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { product2Href } from "@/lib/gadget-preview";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { trackAddToCart } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { getStockState } from "@/lib/stock";

interface GadgetArrivalCardProps {
  product: Product;
  badgeTag?: string;
  isGrid?: boolean;
  variant?: "grid" | "horizontal" | "compact";
}

function computeDiscountPercent(price: number, compareAtPrice?: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return pct > 0 ? pct : null;
}

export function GadgetArrivalCard({
  product,
  badgeTag,
  isGrid = false,
}: GadgetArrivalCardProps) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const href = product2Href(product.slug);
  const image = gadgetImageSrc(product, PRODUCT_IMAGE.card);
  const price = product.price;
  const priceNow = formatPrice(price);
  const priceWas =
    product.compareAtPrice && product.compareAtPrice > price
      ? formatPrice(product.compareAtPrice)
      : null;
  const stock = getStockState(product.stockStatus);
  const tag = badgeTag || product.badge;
  const off = computeDiscountPercent(product.price, product.compareAtPrice);
  const hasRealReviews =
    typeof product.reviewCount === "number" &&
    product.reviewCount > 0 &&
    typeof product.rating === "number" &&
    product.rating > 0;

  function handleBuy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (stock.soldOut) return;

    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: image || undefined,
    });
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price,
      quantity: 1,
    });
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article
      className={cn(
        "gadget-hover-lift group relative flex flex-col bg-transparent",
        isGrid ? "h-full w-full" : "w-[13.25rem] shrink-0 sm:w-[14.5rem]"
      )}
    >
      <div className="relative">
        <Link
          href={href}
          prefetch={false}
          className={cn(
            "gadget-studio-stage relative block overflow-hidden rounded-2xl",
            isGrid ? "aspect-square" : "aspect-square"
          )}
        >
          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-10 flex items-start gap-1.5 pr-11">
            {off ? (
              <span className="shrink-0 rounded-md bg-[var(--g-terracotta)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--g-cream)]">
                −{off}%
              </span>
            ) : null}
            {tag ? (
              <span className="max-w-[70%] truncate rounded-md border border-[var(--g-line)] bg-[var(--g-cream)]/95 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--g-charcoal)]">
                {tag}
              </span>
            ) : null}
          </div>
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              quality={92}
              sizes={isGrid ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" : "268px"}
              className="object-contain p-5 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] sm:p-6"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-[var(--g-taupe)]">
              No image
            </span>
          )}
        </Link>
        <WishlistButton product={product} />
      </div>

      <div className={cn("flex flex-1 flex-col", isGrid ? "px-0.5 pb-1 pt-3" : "px-0.5 pb-1 pt-3")}>
        <Link href={href} prefetch={false} className="min-w-0">
          <h3
            className={cn(
              "font-semibold tracking-tight text-[var(--g-charcoal)] transition group-hover:text-[var(--g-forest)]",
              isGrid
                ? "line-clamp-2 text-[13px] leading-snug sm:text-[14px]"
                : "line-clamp-2 text-[14px] sm:text-[15px]"
            )}
          >
            {product.name}
          </h3>
        </Link>

        {hasRealReviews ? (
          <p className="mt-1 text-[11px] font-medium text-[var(--g-taupe)]">
            {product.rating?.toFixed(1)} · {product.reviewCount} reviews
          </p>
        ) : null}

        <div className="mt-auto flex flex-col pt-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                "text-[1.05rem] font-bold tabular-nums sm:text-[1.15rem]",
                priceWas ? "text-[var(--g-sale)]" : "text-[var(--g-charcoal)]"
              )}
            >
              {priceNow}
            </span>
            {priceWas ? (
              <span className="text-[11px] font-medium text-[var(--g-taupe)] line-through sm:text-[12px]">
                {priceWas}
              </span>
            ) : null}
          </div>

          <div className="mt-3">
            {stock.soldOut ? (
              <Link
                href={href}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--g-cream-deep)] text-[13px] font-semibold text-[var(--g-taupe)] transition hover:bg-[var(--g-line)]"
              >
                View product
              </Link>
            ) : (
              <button
                ref={btnRef}
                type="button"
                onClick={handleBuy}
                title={`Add ${product.name} to cart`}
                aria-label={`Add ${product.name} to cart`}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--g-forest)] text-[13px] font-semibold text-[var(--g-cream)] transition duration-200 hover:bg-[var(--g-forest-mid)] active:scale-[0.99]"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 stroke-[2.25]" aria-hidden />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 stroke-[1.75]" aria-hidden />
                    <span>Add to cart</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
