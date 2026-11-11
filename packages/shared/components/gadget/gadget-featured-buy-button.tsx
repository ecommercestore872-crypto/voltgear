"use client";

import { useRef, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { useCart } from "@/components/cart/cart-provider";
import { gadgetImageSrc } from "@/components/gadget/gadget-image";
import { PRODUCT_IMAGE } from "@/lib/product-image";
import type { Product } from "@/lib/types";

export function GadgetFeaturedBuyButton({
  product,
  soldOut,
}: {
  product: Product;
  soldOut: boolean;
}) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleBuy() {
    if (soldOut) return;
    const defaultVariant =
      product.variants?.find((v) => v.isDefault) ??
      product.variants?.[0] ??
      null;
    const price = defaultVariant?.price ?? product.price;
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

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleBuy}
      className="gadget-buy-cta gadget-press inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-bold transition"
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
  );
}
