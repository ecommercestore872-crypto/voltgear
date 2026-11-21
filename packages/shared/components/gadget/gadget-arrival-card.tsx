"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag, Star } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { gadgetImageSrc } from "@/lib/gadget-image";
import { product2Href } from "@/lib/gadget-preview";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";
import { isPurchasablePrice } from "@/lib/product-price-rules";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getStockState } from "@/lib/stock";

interface GadgetArrivalCardProps {
  product: Product;
  badgeTag?: string;
  isGrid?: boolean;
  variant?: "grid" | "horizontal" | "compact";
}

function computeDiscountPercent(
  price: number,
  compareAtPrice?: number | null,
): number | null {
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
  const canBuy = isPurchasablePrice(price) && !stock.soldOut;
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
    if (!canBuy) return;

    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: image || undefined,
      productId: product._id,
      freeShipping: Boolean(product.freeShipping),
      ...(product.sku ? { sku: product.sku } : {}),
    });
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article
      className={cn(
        "gadget-hover-lift login-card group relative flex flex-col",
        isGrid ? "h-full w-full min-w-0" : "gadget-rail-card h-full",
      )}
    >
      <div className="relative">
        <Link
          href={href}
          prefetch={false}
          className={cn(
            "gadget-studio-stage relative block overflow-hidden rounded-[1.1rem]",
            isGrid ? "aspect-square" : "aspect-square",
          )}
        >
          <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-10 flex items-start gap-1.5 flex-wrap pr-11">
            {stock.soldOut ? (
              <span className="shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white z-20">
                Out of Stock
              </span>
            ) : null}
          </div>
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              quality={70}
              sizes={
                isGrid
                  ? "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  : "260px"
              }
              className="object-contain object-center p-2 transition duration-500 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-[var(--g-taupe)]">
              No image
            </span>
          )}
        </Link>
        <WishlistButton product={product} />
        {tag && !stock.soldOut ? (
          <span className="login-ribbon" aria-label={tag}>
            {tag}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          "px-1.5 pb-1 pt-3",
        )}
      >
        <Link href={href} prefetch={false} className="min-w-0">
          <h3
            className={cn(
              "font-extrabold uppercase tracking-tight text-[var(--g-charcoal)] transition",
              "line-clamp-2 text-[13px] leading-snug sm:text-[14px]",
            )}
          >
            {product.name}
          </h3>
        </Link>

        {product.sku ? (
          <p className="mt-0.5 truncate text-[12px] font-medium text-[var(--g-taupe)]">
            {product.sku}
          </p>
        ) : null}

        {hasRealReviews ? (
          <p className="mt-1.5 flex items-center gap-1 border-b border-[var(--g-line)] pb-2 text-[12px] font-semibold text-[var(--g-charcoal)]">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
            {product.rating?.toFixed(1)}
            <span className="font-medium text-[var(--g-taupe)]">
              ({product.reviewCount})
            </span>
          </p>
        ) : null}

        <div className="mt-auto flex flex-col pt-2.5">
          {!stock.soldOut && (off || stock.status === "low-stock") ? (
            <div className="mb-1 flex flex-wrap items-center gap-1">
              {off ? (
                <span className="g-sale-chip px-2 py-0.5 text-[11px]">
                  SALE {off}% OFF
                </span>
              ) : null}
              {stock.status === "low-stock" ? (
                <span className="g-scarcity-chip px-2 py-0.5 text-[11px]">
                  Limited stock · Almost gone
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span
              className={cn(
                "text-[1.05rem] font-extrabold tabular-nums sm:text-[1.15rem]",
                "g-price-pop",
                off ? "text-[var(--g-sale)]" : "text-[var(--g-charcoal)]",
              )}
            >
              {priceNow}
            </span>
            {priceWas ? (
              <span className="text-[11px] font-medium text-[var(--g-charcoal)]/70 dark:text-gray-400 line-through sm:text-[12px]">
                {priceWas}
              </span>
            ) : null}
          </div>
          <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--g-charcoal)]/75">
            <span className={cn("h-1.5 w-1.5 rounded-full", stock.soldOut ? "bg-red-600" : "bg-emerald-600")} aria-hidden />
            {stock.label}
          </span>

          <div className="mt-3">
            {!canBuy ? (
              <Link
                href={href}
                className="flex h-11 w-full items-center justify-center rounded-full bg-[#f1f1f1] text-[13px] font-semibold text-[var(--g-charcoal)] transition hover:bg-[var(--g-line)]"
              >
                {stock.soldOut
                  ? "View product"
                  : isPurchasablePrice(price)
                    ? "View product"
                    : "Unavailable"}
              </Link>
            ) : (
              <button
                ref={btnRef}
                type="button"
                onClick={handleBuy}
                title={`Add ${product.name} to cart`}
                aria-label={
                  added
                    ? `Added to cart: ${product.name}`
                    : `Add to cart: ${product.name}`
                }
                className="gadget-buy-cta flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition duration-200 active:scale-[0.99]"
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4 stroke-[2.25]" aria-hidden />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag
                      className="h-4 w-4 stroke-[1.75]"
                      aria-hidden
                    />
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
