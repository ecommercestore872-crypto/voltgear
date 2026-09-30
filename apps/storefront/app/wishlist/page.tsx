import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { STOREFRONT_LEGAL_REVALIDATE } from "@/lib/storefront-cache";

import { WishlistStaticShell } from "@/components/wishlist/wishlist-static-shell";

const WishlistClient = dynamic(
  () => import("./wishlist-client").then((m) => m.WishlistClient),
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

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View and manage your saved items.",
  robots: { index: false, follow: false },
};

export const revalidate = STOREFRONT_LEGAL_REVALIDATE;

export default function WishlistPage() {
  return (
    <>
      <WishlistStaticShell />
      <WishlistClient />
    </>
  );
}
