import type { Metadata } from "next";

import { WishlistStaticShell } from "@/components/wishlist/wishlist-static-shell";

import { WishlistPageClient } from "../client-only-pages";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View and manage your saved items.",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

export default function WishlistPage() {
  return (
    <>
      <WishlistStaticShell />
      <WishlistPageClient />
    </>
  );
}
