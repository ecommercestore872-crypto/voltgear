"use client";

import dynamic from "next/dynamic";

const PageSkeleton = () => (
  <div
    className="mx-auto min-h-[40vh] max-w-6xl animate-pulse px-4 py-10 lg:px-8"
    aria-busy="true"
  />
);

export const CartPageClient = dynamic(() => import("./cart/cart-page-client"), {
  ssr: false,
  loading: PageSkeleton,
});

export const CheckoutPageClient = dynamic(
  () => import("@/components/checkout/checkout-page-client"),
  { ssr: false, loading: () => null },
);

export const TrackOrderClient = dynamic(
  () => import("@/components/orders/track-order").then((module) => module.TrackOrder),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[200px] animate-pulse rounded-2xl bg-[var(--g-line)]/30"
        aria-busy="true"
      />
    ),
  },
);

export const WishlistPageClient = dynamic(
  () => import("./wishlist/wishlist-client").then((module) => module.WishlistClient),
  { ssr: false, loading: PageSkeleton },
);
