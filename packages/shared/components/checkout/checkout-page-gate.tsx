"use client";

import dynamic from "next/dynamic";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { CheckoutHydrationFallback } from "@/components/checkout/checkout-hydration-fallback";
import { StorefrontLink as Link } from "@/components/navigation/storefront-link";
import { Button } from "@/components/ui/button";

const CheckoutFlowClient = dynamic(
  () => import("@/components/checkout/checkout-page-client"),
  { loading: () => <CheckoutHydrationFallback /> },
);

/**
 * Restore the small persisted-cart snapshot before loading the full checkout.
 * Empty carts never download form, promo, or tracking code they cannot use.
 */
export function CheckoutPageGate() {
  const { hydrated, items } = useCart();

  if (!hydrated) return <CheckoutHydrationFallback />;

  if (items.length === 0) {
    return (
      <div className="container mx-auto min-h-[calc(100dvh-10rem)] max-w-xl px-4 py-16 lg:px-8">
        <div className="rounded-2xl border border-dashed p-6 text-center sm:p-12">
          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight">
            Your cart is empty
          </h2>
          <p className="mx-auto mt-2 max-w-[16rem] text-sm text-muted-foreground">
            Add some products and come back to check out.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">Start Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <CheckoutFlowClient />;
}
