"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { product2Href } from "@/lib/gadget-preview";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { trackAddToCart } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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

function getProductBadges(product: Product, overrideTag?: string) {
  const tag = overrideTag || product.badge;
  const off = computeDiscountPercent(product.price, product.compareAtPrice);
  return { tag, off };
}

function statusLine(product: Product): string {
  if (product.shortDescription?.trim()) {
    return product.shortDescription.trim();
  }
  return "20W fast charging · All-day reliability";
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
  const image = product.images?.[0] || null;
  const price = product.price;

  const priceNow = formatPrice(price);
  const priceWas =
    product.compareAtPrice && product.compareAtPrice > price
      ? formatPrice(product.compareAtPrice)
      : null;

  const stock = { soldOut: product.stockStatus === "out-of-stock" };
  const { tag, off } = getProductBadges(product, badgeTag);

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
        "gadget-hover-lift group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-[var(--g-card-border)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]",
        isGrid ? "h-full w-full" : "w-[13.25rem] shrink-0 sm:w-[14.5rem]"
      )}
    >
      <Link
        href={href}
        prefetch={false}
        className={cn(
          "relative block overflow-hidden bg-[linear-gradient(165deg,var(--g-cream-deep),color-mix(in_srgb,var(--g-cream)_70%,white))]",
          isGrid
            ? "mx-2 mt-2 aspect-[4/5] rounded-[1.05rem] sm:mx-2.5 sm:mt-2.5 sm:aspect-square"
            : "mx-3 mt-3 aspect-square rounded-[1.1rem]"
        )}
      >
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1.5 pointer-events-none sm:inset-x-2.5 sm:top-2.5">
          {tag ? (
            <span className="max-w-[70%] truncate rounded-full border border-[var(--g-line)] bg-[var(--g-white)]/95 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--g-charcoal)] shadow-sm backdrop-blur-md sm:text-[9.5px]">
              {tag}
            </span>
          ) : (
            <span />
          )}
          {off ? (
            <span className="shrink-0 rounded-full bg-[var(--g-forest)] px-2.5 py-0.5 text-[9px] font-bold tracking-wide text-[var(--g-white)] shadow-sm sm:text-[9.5px]">
              −{off}%
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
            className="object-contain p-3 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] sm:p-4"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-sm text-[var(--g-taupe)]">
            No image
          </span>
        )}
      </Link>

      <div
        className={cn(
          "flex flex-1 flex-col",
          isGrid ? "px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5 sm:pt-3.5" : "px-3.5 pb-3.5 pt-3"
        )}
      >
        <Link href={href} prefetch={false} className="min-w-0">
          <h3
            className={cn(
              "font-bold tracking-tight text-[var(--g-charcoal)] transition group-hover:text-[var(--g-forest)]",
              isGrid
                ? "line-clamp-2 text-[13px] leading-snug sm:text-[14px]"
                : "truncate text-[15px]"
            )}
          >
            {product.name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--g-taupe)]">
          <span className="flex items-center text-amber-400">★</span>
          <span className="font-semibold text-[var(--g-charcoal)]">4.8</span>
          <span>(44)</span>
        </div>

        <p className="mt-1 truncate text-[11.5px] font-normal leading-relaxed text-[var(--g-taupe)] sm:text-[12px]">
          {statusLine(product)}
        </p>

        <div className="mt-auto flex flex-col pt-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-[1.05rem] sm:text-[1.15rem] font-extrabold tabular-nums text-[var(--g-charcoal)]">
              {priceNow}
            </span>
            {priceWas ? (
              <span className="text-[11px] font-semibold text-[var(--g-price-strike)] line-through sm:text-[11.5px]">
                {priceWas}
              </span>
            ) : null}
          </div>

          <div className="mt-3">
            {stock.soldOut ? (
              <Link
                href={href}
                className="flex h-10 w-full items-center justify-center gap-1 rounded-full bg-[var(--g-cream-deep)] text-[12px] font-bold text-[var(--g-taupe)] transition hover:bg-[var(--g-line)]"
              >
                View Product
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <button
                ref={btnRef}
                type="button"
                onClick={handleBuy}
                title={`Add ${product.name} to cart`}
                aria-label={`Add ${product.name} to cart`}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[var(--g-forest)] text-[12px] font-bold text-[var(--g-white)] shadow-sm transition duration-200 hover:bg-[var(--g-forest-mid)] hover:shadow-md active:scale-95"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4 stroke-[2.5]" aria-hidden />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="mt-3 border-t border-[var(--g-line)] pt-2 text-[10.5px] font-semibold text-[var(--g-taupe)]">
            Free delivery · COD available
          </p>
        </div>
      </div>
    </article>
  );
}
