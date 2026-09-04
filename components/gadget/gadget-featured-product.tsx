"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ShoppingBag, Star } from "lucide-react";

import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { useCart } from "@/components/cart/cart-provider";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { salePercent } from "@/components/gadget/gadget-sale";
import { trackAddToCart } from "@/lib/analytics";
import { product2Href } from "@/lib/gadget-preview";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function GadgetFeaturedProduct({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const image = gadgetImageSrc(product, PRODUCT_IMAGE.gallery);
  const stock = getStockState(product.stockStatus);
  const href = product2Href(product.slug);
  const off = salePercent(product.price, product.compareAtPrice);
  const rating = product.rating != null && product.rating > 0 ? product.rating : null;
  const features = (product.features ?? []).filter(Boolean).slice(0, 3);

  function handleBuy() {
    if (stock.soldOut) return;
    const defaultVariant =
      product.variants?.find((v) => v.isDefault) ?? product.variants?.[0] ?? null;
    const price = defaultVariant?.price ?? product.price;
    const itemImage = gadgetImageSrc(product, PRODUCT_IMAGE.thumb) || undefined;
    addItem({
      slug: product.slug,
      name: product.name,
      price,
      image: itemImage,
      ...(defaultVariant
        ? {
            variantKey: defaultVariant._key,
            variantName: defaultVariant.name,
            ...(defaultVariant.sku ? { variantSku: defaultVariant.sku } : {}),
          }
        : {}),
    });
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price,
      quantity: 1,
    });
    const btn = btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      dispatchAddToCartEffect(null, r.left + r.width / 2, r.top);
    }
    setAdded(true);
    openCart();
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <section
      className="gadget-band-forest py-10 sm:py-14"
      aria-labelledby="featured-product-heading"
    >
      <div className="mx-auto max-w-5xl px-4 lg:px-8">
        <p className="gadget-eyebrow">Featured</p>
        <h2
          id="featured-product-heading"
          className="gadget-h2 mt-2 text-[var(--g-charcoal)]"
        >
          Staff pick
        </h2>
        <p className="gadget-body mt-2 max-w-lg">
          One standout product worth a closer look — clear price, ready to buy.
        </p>

        <div className="mt-8 grid items-stretch overflow-hidden rounded-[1.75rem] border border-[var(--g-line)] bg-[var(--g-white)] lg:grid-cols-2 lg:gap-0">
          <Link
            href={href}
            prefetch={false}
            className="flex relative min-h-[16rem] bg-[var(--g-cream)] sm:min-h-[20rem] lg:min-h-0 h-full"
          >
            {image ? (
               <div className="relative w-full h-full flex items-center justify-center p-8 sm:p-10 lg:p-8">
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  quality={92}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain transition duration-500 hover:scale-[1.03] p-4 lg:p-6"
                />
              </div>
            ) : (
              <span className="flex w-full h-full min-h-[18rem] items-center justify-center text-[var(--g-taupe)]">
                No image
              </span>
            )}
            {off ? (
              <span className="absolute left-4 top-4 rounded-full bg-[var(--g-terracotta)] px-3 py-1 text-xs font-bold text-[var(--g-cream)]">
                {off}% OFF
              </span>
            ) : null}
          </Link>

          <div className="flex flex-col px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
              {product.category.replace(/-/g, " ")}
              {product.badge ? ` · ${product.badge}` : ""}
            </p>
            <Link href={href} prefetch={false}>
              <h3 className="gadget-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--g-charcoal)] hover:text-[var(--g-forest)] sm:text-3xl">
                {product.name}
              </h3>
            </Link>

            {rating != null ? (
              <div className="mt-3 flex items-center gap-1.5" aria-label={`Rated ${rating.toFixed(1)} of 5`}>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                <span className="text-sm font-semibold tabular-nums">{rating.toFixed(1)}</span>
                {product.reviewCount ? (
                  <span className="text-sm text-[var(--g-taupe)]">({product.reviewCount} reviews)</span>
                ) : null}
              </div>
            ) : null}

            {product.shortDescription ? (
              <p className="mt-4 text-[15px] leading-relaxed text-[var(--g-taupe)] line-clamp-2">
                {product.shortDescription}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-bold tabular-nums text-[var(--g-charcoal)]">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                <span className="pb-1 text-lg text-[var(--g-taupe)] line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              ) : null}
            </div>

            <p
              className={`mt-2 text-sm font-semibold ${
                stock.soldOut
                  ? "text-[var(--g-taupe)]"
                  : stock.status === "low-stock"
                    ? "text-amber-700"
                    : "text-[var(--g-forest)]"
              }`}
            >
              {stock.label}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              {stock.soldOut ? (
                <Link
                  href={href}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--g-line)] px-6 text-sm font-semibold text-[var(--g-charcoal)]"
                >
                  View details
                </Link>
              ) : (
                <button
                  ref={btnRef}
                  type="button"
                  onClick={handleBuy}
                  className="gadget-press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--g-forest)] px-7 text-sm font-bold text-[var(--g-white)] shadow-[0_8px_24px_rgba(31,54,38,0.22)] transition hover:bg-[var(--g-forest-mid)]"
                >
                  {added ? (
                    <>
                      <Check className="h-4 w-4" strokeWidth={1.75} /> Added
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="h-4 w-4" strokeWidth={1.75} /> Buy now
                    </>
                  )}
                </button>
              )}
              <Link
                href={href}
                className="inline-flex h-12 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--g-forest)] hover:underline"
              >
                See full details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
