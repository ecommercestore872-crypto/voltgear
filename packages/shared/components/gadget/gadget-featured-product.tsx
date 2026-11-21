"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Check, ShoppingBag, Star } from "lucide-react";

import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { useCart } from "@/components/cart/cart-provider";
import { gadgetImageSrc } from "@/lib/gadget-image";
import { salePercent } from "@/components/gadget/gadget-sale";
import { product2Href } from "@/lib/gadget-preview";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { isPurchasablePrice } from "@/lib/product-price-rules";
import { getStockState } from "@/lib/stock";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

export function GadgetFeaturedProduct({
  product,
  eyebrow,
  title,
  subtitle,
  productDescription,
  customImage,
}: {
  product: Product;
  eyebrow?: string | null;
  title?: string | null;
  subtitle?: string | null;
  productDescription?: string | null;
  customImage?: string | null;
}) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const image = customImage || gadgetImageSrc(product, PRODUCT_IMAGE.gallery);
  const stock = getStockState(product.stockStatus);
  const href = product2Href(product.slug);
  const off = salePercent(product.price, product.compareAtPrice);
  const rating =
    product.rating != null &&
    product.rating > 0 &&
    typeof product.reviewCount === "number" &&
    product.reviewCount > 0
      ? product.rating
      : null;
  const features = (product.features ?? []).filter(Boolean).slice(0, 3);
  const canBuy =
    !stock.soldOut && isPurchasablePrice(product.price);

  function handleBuy() {
    if (!canBuy) return;
    const defaultVariant =
      product.variants?.find((v) => v.isDefault) ??
      product.variants?.[0] ??
      null;
    const price = defaultVariant?.price ?? product.price;
    if (!isPurchasablePrice(price)) return;
    const itemImage = gadgetImageSrc(product, PRODUCT_IMAGE.thumb) || undefined;
    addItem({
      slug: product.slug,
      name: product.name,
      price,
      image: itemImage,
      productId: product._id,
      freeShipping: Boolean(product.freeShipping),
      ...(product.sku ? { sku: product.sku } : {}),
      ...(defaultVariant
        ? {
            variantKey: defaultVariant._key,
            variantName: defaultVariant.name,
            ...(defaultVariant.sku ? { variantSku: defaultVariant.sku } : {}),
          }
        : {}),
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

  const lowStock = !stock.soldOut && stock.status === "low-stock";

  return (
    <section
      className="px-3 py-8 sm:px-5 sm:py-12 lg:px-8"
      aria-labelledby="featured-product-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-[#0b0b0f] text-white sm:rounded-[2.25rem]">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-[var(--g-sale)] opacity-30 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 left-1/4 h-[22rem] w-[22rem] rounded-full bg-violet-600 opacity-25 blur-3xl"
            aria-hidden
          />

          <div className="relative grid items-center gap-6 p-5 sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:p-12">
            <Link
              href={href}
              prefetch={false}
              aria-label={product.name}
              className="relative mx-auto block aspect-square w-full max-w-[26rem] lg:max-w-none"
            >
              <div className="absolute inset-[6%] rounded-[2rem] bg-white shadow-[0_30px_80px_-20px_rgba(225,29,46,0.55)]" />
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  fill
                  quality={90}
                  sizes="(max-width: 1024px) 90vw, 520px"
                  className="object-contain p-[10%] drop-shadow-[0_24px_28px_rgba(0,0,0,0.25)] transition duration-500 hover:scale-[1.04]"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                  No image
                </span>
              )}
              {off ? (
                <span className="g-sale-chip absolute left-1 top-1 px-3.5 py-1.5 text-sm sm:text-base">
                  SALE −{off}%
                </span>
              ) : null}
            </Link>

            <div className="flex flex-col">
              <p className="inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 ring-1 ring-white/15">
                {eyebrow || "In focus"}
              </p>
              <h2
                id="featured-product-heading"
                className="mt-4 text-white text-3xl font-black italic uppercase leading-[0.95] tracking-tight sm:text-5xl"
              >
                {title || product.name}
              </h2>
              {subtitle ? (
                <p className="mt-3 max-w-md text-sm text-white/70 sm:text-base">
                  {subtitle}
                </p>
              ) : null}

              <Link href={href} prefetch={false}>
                <h3 className="mt-5 text-lg font-extrabold tracking-tight text-white hover:underline sm:text-xl">
                  {product.name}
                </h3>
              </Link>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                {product.category.replace(/-/g, " ")}
                {product.badge ? ` · ${product.badge}` : ""}
              </p>

              {rating != null ? (
                <div
                  className="mt-3 flex items-center gap-1.5"
                  role="img"
                  aria-label={`Rated ${rating.toFixed(1)} of 5`}
                >
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.75} />
                  <span className="text-sm font-semibold tabular-nums">{rating.toFixed(1)}</span>
                  {product.reviewCount ? (
                    <span className="text-sm text-white/60">({product.reviewCount} reviews)</span>
                  ) : null}
                </div>
              ) : null}

              {productDescription || product.shortDescription ? (
                <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-white/75">
                  {productDescription || product.shortDescription}
                </p>
              ) : null}

              {features.length ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {features.map((f) => (
                    <li
                      key={f}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/15"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="g-price-pop text-4xl font-black tabular-nums text-white sm:text-5xl">
                  {formatPrice(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price ? (
                  <span className="pb-1.5 text-lg text-white/55 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white/80">{stock.label}</span>
                {lowStock ? (
                  <span className="g-scarcity-chip px-2.5 py-0.5 text-xs">
                    Limited stock · Almost gone
                  </span>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                {!canBuy ? (
                  <Link
                    href={href}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-bold text-[#111]"
                  >
                    View details
                  </Link>
                ) : (
                  <button
                    ref={btnRef}
                    type="button"
                    onClick={handleBuy}
                    className="gadget-buy-cta gadget-press inline-flex h-12 items-center justify-center gap-2 rounded-full !border-white !bg-white px-8 text-sm font-bold !text-[#111] transition hover:!bg-white/90"
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2} /> Added
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" strokeWidth={2} /> Add to cart
                      </>
                    )}
                  </button>
                )}
                <Link
                  href={href}
                  className="inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10"
                >
                  See full details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
