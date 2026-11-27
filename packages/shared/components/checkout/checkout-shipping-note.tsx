"use client";

import { Truck } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";

/** Shipping trust line. Server HTML shows `fallback`; swaps once the cart is known. */
export function CheckoutShippingNote({ fallback }: { fallback: string }) {
  const { items, hydrated } = useCart();
  const anyFree =
    hydrated && items.length > 0 && items.some((item) => item.freeShipping);

  return (
    <li className="inline-flex items-center gap-1.5">
      <Truck className="h-3.5 w-3.5 text-[var(--g-forest)]" aria-hidden />
      {anyFree ? "Free delivery on your order" : fallback}
    </li>
  );
}
