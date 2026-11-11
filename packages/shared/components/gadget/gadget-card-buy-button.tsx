"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/types";

export function GadgetCardBuyButton({
  product,
  image,
}: {
  product: Product;
  image?: string | null;
}) {
  const { addItem, openCart } = useCart();
  const [added, setAdded] = useState(false);

  function handleBuy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

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
    <button
      type="button"
      onClick={handleBuy}
      title={added ? "Added to cart" : `Add to cart: ${product.name}`}
      aria-label={added ? "Added to cart" : `Add to cart: ${product.name}`}
      className="gadget-buy-cta flex h-12 w-full items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold transition duration-200 active:scale-[0.99]"
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
  );
}
