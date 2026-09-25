import type { Metadata } from "next";
import { STOREFRONT_LEGAL_REVALIDATE } from "@/lib/storefront-cache";

import { WishlistClient } from "./wishlist-client";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View and manage your saved items.",
  robots: { index: false, follow: false },
};

export const revalidate = STOREFRONT_LEGAL_REVALIDATE;

export default function WishlistPage() {
  return <WishlistClient />;
}
