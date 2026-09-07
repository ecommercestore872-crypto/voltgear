"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BuyNow } from "@/components/product/buy-now";
import { useCart } from "@/components/cart/cart-provider";
import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import { cloudinaryImageUrl } from "@/lib/cloudinary";
import { imageUrl } from "@/lib/sanity/image";
import { getStockState, getDefaultVariant } from "@/lib/stock";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function StickyAddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [visible, setVisible] = useState(false);
  const [added, setAdded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const img = product.images?.[0];
  const itemImage = img
    ? imageUrl(img, { w: 128 })
    : product.cloudinaryImages?.[0]
      ? cloudinaryImageUrl(product.cloudinaryImages[0], { w: 128 })
      : undefined;

  const stock = getStockState(product.stockStatus);
  const defaultVariant = getDefaultVariant(product);
  const hasVariants = (product.variants?.length ?? 0) > 0;

  function handleAdd() {
    if (!hasVariants || defaultVariant) {
      addItem({
        slug: product.slug,
        name: product.name,
        price: defaultVariant?.price ?? product.price,
        image: itemImage,
        productId: product._id,
        ...(product.sku ? { sku: product.sku } : {}),
        ...(defaultVariant
          ? {
              variantKey: defaultVariant._key,
              variantId: defaultVariant._key,
              variantName: defaultVariant.name,
              ...(defaultVariant.sku ? { variantSku: defaultVariant.sku } : {}),
            }
          : {}),
      });
    }
    const bar = document.getElementById("sticky-add-bar");
    if (bar) {
      const r = bar.getBoundingClientRect();
      dispatchAddToCartEffect(null, r.left + r.width / 2, r.top);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  // A variant product without an unambiguous default must not be quick-added;
  // the purchase panel on the page is the safe surface for those.
  if (stock.soldOut || (hasVariants && !defaultVariant)) return null;

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-0" />
      <div
        id="sticky-add-bar"
        className={`fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container mx-auto flex items-center gap-3 px-4 py-3 lg:px-8">
          {img && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl(img, { w: 96 })}
              alt=""
              className="hidden h-12 w-12 rounded-md object-cover sm:block"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="text-lg font-bold">
              {formatPrice(defaultVariant?.price ?? product.price)}
            </p>
          </div>
          <Button size="lg" className="shrink-0 px-6 sm:px-8 shadow-sm hover:scale-[1.02] active:scale-[0.95] transition-all duration-300" onClick={handleAdd}>
            {added ? (
              <>
                <Check className="mr-2 h-4 w-4" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Add to Cart
              </>
            )}
          </Button>
          <div className="shrink-0">
            <BuyNow
              product={product}
              variant={defaultVariant}
              quantity={1}
              image={itemImage}
            />
          </div>
        </div>
      </div>
    </>
  );
}