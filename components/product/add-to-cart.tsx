"use client";

import { useState, useRef } from "react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { trackAddToCart } from "@/lib/analytics";
import { imageUrl } from "@/lib/sanity/image";
import { dispatchAddToCartEffect } from "@/components/effects/cart-effects";
import type { Product } from "@/lib/types";

export function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const outOfStock = product.stockStatus === "out-of-stock";

  function handleAdd() {
    if (outOfStock) return;
    addItem(
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.images?.[0]
          ? imageUrl(product.images[0], { w: 128 })
          : undefined,
        productId: product._id,
        freeShipping: Boolean(product.freeShipping),
        freeShipping: Boolean(product.freeShipping),
        freeShipping: Boolean(product.freeShipping),
        ...(product.sku ? { sku: product.sku } : {}),
      },
      quantity,
    );
    trackAddToCart({
      item_id: product.slug,
      item_name: product.name,
      price: product.price,
      quantity,
    });
    const btn = btnRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      dispatchAddToCartEffect(null, r.left + r.width / 2, r.top);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {!outOfStock && (
        <div className="flex items-center gap-3 rounded-md border px-3 py-2">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      <Button
        ref={btnRef}
        size="lg"
        className="flex-1 sm:flex-none sm:px-10"
        disabled={outOfStock}
        onClick={handleAdd}
      >
        {added ? (
          <>
            <Check className="mr-2 h-4 w-4" /> Added to Cart
          </>
        ) : (
          <>
            <ShoppingBag className="mr-2 h-4 w-4" />
            {outOfStock ? "Sold Out" : "Add to Cart"}
          </>
        )}
      </Button>
    </div>
  );
}
