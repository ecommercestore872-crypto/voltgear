"use client";

import dynamic from "next/dynamic";

export const WishlistClientLoader = dynamic(
  () => import("./wishlist-client").then((module) => module.WishlistClient),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto min-h-[40vh] max-w-6xl animate-pulse px-4 py-10 lg:px-8"
        aria-busy="true"
      />
    ),
  },
);
