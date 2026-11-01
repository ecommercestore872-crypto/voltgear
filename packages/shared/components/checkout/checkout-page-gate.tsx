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
      <div className="mx-auto min-h-[calc(100dvh-10rem)] max-w-xl px-4 py-14 lg:px-8">
        <div className="rounded-[10px] border border-[var(--g-line)] bg-[var(--g-white)] p-6 text-center sm:p-10">
          <ShoppingBag className="mx-auto h-10 w-10 text-[var(--g-taupe)]" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--g-charcoal)]">
            Your cart is empty
          </h1>
          <p className="mx-auto mt-2 max-w-[18rem] text-sm text-[var(--g-taupe)]">
            Add products first, then check out with cash on delivery.
          </p>
          <Button asChild className="mt-6 rounded-[10px]">
            <Link href="/products">Browse products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <CheckoutFlowClient />;
}
