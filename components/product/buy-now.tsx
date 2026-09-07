"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/cart-provider";
import { imageUrl } from "@/lib/sanity/image";
import type { Product, ProductVariant } from "@/lib/types";

/**
 * Buy Now: adds the selected product/variant to the current cart (preserving
 * any existing cart contents) and navigates straight to checkout. It never
 * wipes the customer's cart.
 */
export function BuyNow({
  product,
  variant,
  quantity,
  image,
}: {
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  image?: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [buying, setBuying] = useState(false);

  const price = variant?.price ?? product.price;
  const itemImage =
    image ??
    (product.images?.[0] ? imageUrl(product.images[0], { w: 128 }) : undefined);

  async function handleBuyNow() {
    if (buying) return;
    setBuying(true);
    try {
      addItem(
        {
          slug: product.slug,
          name: product.name,
          price,
          image: itemImage,
          productId: product._id,
          ...(product.sku ? { sku: product.sku } : {}),
          ...(variant && (product.variants?.length ?? 0) > 0
            ? {
                variantKey: variant._key,
                variantId: variant._key,
                variantName: variant.name,
                ...(variant.sku ? { variantSku: variant.sku } : {}),
              }
            : {}),
        },
        quantity
      );
      router.push("/checkout");
    } finally {
      // Reset shortly after navigation so the button can be reused.
      setTimeout(() => setBuying(false), 1000);
    }
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="flex-1 sm:flex-none sm:px-8"
      onClick={handleBuyNow}
      disabled={buying}
    >
      <Zap className="mr-2 h-4 w-4" />
      {buying ? "Opening Checkout…" : "Buy Now"}
    </Button>
  );
}