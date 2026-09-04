"use client";

import { useRef, useState } from "react";
import {
  Banknote,
  Check,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";

import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { ProductGallery } from "@/components/product/product-gallery";
import { useCart } from "@/components/cart/cart-provider";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { salePercent } from "@/components/gadget/gadget-sale";
import { trackAddToCart } from "@/lib/analytics";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import { getVariantStockState } from "@/lib/stock";
import type { PublicSiteConfig } from "@/lib/site-config";
import { warrantyLabel } from "@/lib/site-config";
import type { Product, ProductVariant } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

function defaultVariant(product: Product): ProductVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  return variants.find((v) => v.isDefault) ?? variants[0];
}

export function GadgetBuyBox({
  product,
  config,
}: {
  product: Product;
  config: PublicSiteConfig;
}) {
  const { addItem, openCart } = useCart();
  const [variant, setVariant] = useState<ProductVariant | null>(() => defaultVariant(product));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hasVariants = (product.variants?.length ?? 0) > 0;
  const stock = getVariantStockState(product, variant);
  const outOfStock = stock.soldOut;
  const price = variant?.price ?? product.price;
  const compareAtPrice = variant?.compareAtPrice ?? product.compareAtPrice;
  const off = salePercent(price, compareAtPrice);
  const rating = product.rating != null && product.rating > 0 ? product.rating : 4.8;
  const reviewCount = product.reviewCount ?? 0;
  const threshold = Number(config.freeShippingThreshold ?? 0);
  const itemImage = gadgetImageSrc(product, PRODUCT_IMAGE.thumb) || undefined;

  function handleAdd(open = true, event?: React.MouseEvent<HTMLButtonElement>) {
    if (outOfStock) return;
    addItem(
      {
        slug: product.slug,
        name: product.name,
        price,
        image: itemImage,
        ...(variant && hasVariants
          ? {
              variantKey: variant._key,
              variantName: variant.name,
              ...(variant.sku ? { variantSku: variant.sku } : {}),
            }
          : {}),
      },
      quantity
    );
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price,
      quantity,
    });
    const btn = event?.currentTarget || btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      dispatchAddToCartEffect(null, r.left + r.width / 2, r.top);
    }
    setAdded(true);
    if (open) openCart();
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 md:items-start md:gap-8 lg:gap-12">
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)] p-3 sm:max-w-lg md:max-w-none md:p-3 lg:p-4">
          <ProductGallery product={product} />
        </div>

        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
            {product.category.replace(/-/g, " ")}
            {product.badge ? ` · ${product.badge}` : ""}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[var(--g-charcoal)] sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1" aria-label={`Rated ${rating.toFixed(1)} of 5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-amber-400/30"
                  }`}
                />
              ))}
              <span className="ml-1 text-sm font-semibold tabular-nums text-[var(--g-charcoal)]">
                {rating.toFixed(1)}
              </span>
            </div>
            {reviewCount > 0 ? (
              <span className="text-sm text-[var(--g-taupe)]">{reviewCount} reviews</span>
            ) : (
              <span className="text-sm text-[var(--g-taupe)]">Trusted by buyers</span>
            )}
          </div>

          {product.shortDescription ? (
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--g-taupe)]">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-bold tabular-nums text-[var(--g-charcoal)] dark:text-foreground sm:text-4xl">
              {formatPrice(price)}
            </span>
            {compareAtPrice && compareAtPrice > price ? (
              <span className="pb-1 text-lg text-[var(--g-taupe)] dark:text-muted-foreground line-through">
                {formatPrice(compareAtPrice)}
              </span>
            ) : null}
            {off ? (
              <span className="mb-1 rounded-full bg-[var(--g-forest)] dark:bg-primary px-2.5 py-1 text-xs font-bold text-[var(--g-white)] dark:text-primary-foreground">
                {off}% OFF
              </span>
            ) : null}
          </div>

          <p
            className={cn(
              "mt-2 text-sm font-semibold",
              outOfStock
                ? "text-[var(--g-taupe)]"
                : stock.status === "low-stock"
                  ? "text-amber-700"
                  : "text-[var(--g-forest)]"
            )}
          >
            {stock.label}
            {stock.status === "low-stock" && !outOfStock ? " — order soon" : null}
          </p>

          {hasVariants ? (
            <fieldset className="mt-6">
              <legend className="mb-2 text-sm font-semibold text-[var(--g-charcoal)]">Choose option</legend>
              <div className="flex flex-wrap gap-2">
                {product.variants!.map((v) => {
                  const selected = variant?._key === v._key;
                  const sold = getVariantStockState(product, v).soldOut;
                  return (
                    <button
                      key={v._key ?? v.name}
                      type="button"
                      disabled={sold}
                      aria-pressed={selected}
                      onClick={() => setVariant(v)}
                      className={cn(
                        "min-h-11 rounded-full border px-4 text-sm font-semibold transition",
                        selected
                          ? "border-[var(--g-forest)] bg-[var(--g-forest)] text-[var(--g-white)]"
                          : "border-[var(--g-line)] bg-[var(--g-white)] text-[var(--g-charcoal)] hover:border-[var(--g-forest)]",
                        sold && "cursor-not-allowed line-through opacity-40"
                      )}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {!outOfStock ? (
              <div className="flex h-12 w-full justify-between sm:w-fit sm:justify-center items-center gap-3 rounded-full border border-[var(--g-line)] bg-[var(--g-white)] px-5 sm:px-4">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--g-cream-deep)]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-bold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--g-cream-deep)]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <button
              ref={btnRef}
              type="button"
              disabled={outOfStock}
              onClick={(e) => handleAdd(true, e)}
              className="gadget-btn-primary gadget-press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-[var(--g-cream-deep)] disabled:text-[var(--g-taupe)] disabled:shadow-none disabled:filter-none"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" strokeWidth={1.75} /> Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
                  {outOfStock ? "Sold out" : "Buy now"}
                </>
              )}
            </button>
          </div>

          {!outOfStock ? (
            <p className="mt-2 text-center text-xs text-[var(--g-taupe)] sm:text-left">
              {[
                config.codEnabled ? "Cash on delivery" : null,
                config.warrantyMonths ? warrantyLabel(config.warrantyMonths) : null,
                threshold > 0 ? `Free shipping over ${formatPrice(threshold)}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Secure checkout · Confirmation by SMS"}
            </p>
          ) : null}

          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {config.codEnabled ? (
              <li className="flex items-center gap-2.5 rounded-xl bg-[var(--g-cream-deep)] px-3 py-2.5 text-sm text-[var(--g-charcoal)]">
                <Banknote className="h-4 w-4 shrink-0 text-[var(--g-forest)]" strokeWidth={1.75} aria-hidden />
                Cash on delivery
              </li>
            ) : null}
            <li className="flex items-center gap-2.5 rounded-xl bg-[var(--g-cream-deep)] px-3 py-2.5 text-sm text-[var(--g-charcoal)]">
              <Truck className="h-4 w-4 shrink-0 text-[var(--g-forest)]" strokeWidth={1.75} aria-hidden />
              {threshold > 0 ? `Free shipping over ${formatPrice(threshold)}` : "Nationwide delivery"}
            </li>
            {config.warrantyMonths ? (
              <li className="flex items-center gap-2.5 rounded-xl bg-[var(--g-cream-deep)] px-3 py-2.5 text-sm text-[var(--g-charcoal)]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--g-forest)]" strokeWidth={1.75} aria-hidden />
                {warrantyLabel(config.warrantyMonths)}
              </li>
            ) : null}
            {config.returnWindowDays ? (
              <li className="flex items-center gap-2.5 rounded-xl bg-[var(--g-cream-deep)] px-3 py-2.5 text-sm text-[var(--g-charcoal)]">
                <RefreshCw className="h-4 w-4 shrink-0 text-[var(--g-forest)]" strokeWidth={1.75} aria-hidden />
                {config.returnWindowDays}-day returns
              </li>
            ) : null}
          </ul>

          <p className="mt-4 flex items-start gap-2 text-sm text-[var(--g-taupe)]">
            <Package className="mt-0.5 h-4 w-4 shrink-0 text-[var(--g-sage)]" strokeWidth={1.75} aria-hidden />
            Secure checkout · Order confirmation by SMS
          </p>
        </div>
      </div>

      {/* Mobile sticky CTA — safe-area for iPhone home indicator */}
      {!outOfStock ? (
        <div className="gadget-sticky-cta fixed inset-x-0 bottom-0 z-30 border-t border-[var(--g-line)] dark:border-border bg-[var(--g-cream)]/95 dark:bg-background/95 px-3 pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--g-charcoal)] dark:text-foreground">{formatPrice(price)}</p>
              {off ? <p className="text-[11px] font-semibold text-[var(--g-forest)] dark:text-primary">{off}% off</p> : null}
            </div>
            <button
              type="button"
              onClick={(e) => handleAdd(true, e)}
              className="gadget-btn-primary gadget-press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-sm font-bold"
            >
              <ShoppingBag className="h-4 w-4" />
              Buy now
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
