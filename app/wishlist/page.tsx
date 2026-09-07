import type { Metadata } from "next";
import { fetchCatalogProducts } from "@/lib/db/store";
import { WishlistClient } from "./wishlist-client";

export const metadata: Metadata = {
  title: "My Wishlist",
  description: "View and manage your saved items.",
  robots: { index: false, follow: false },
};

export const revalidate = 60;

export default async function WishlistPage() {
  const products = await fetchCatalogProducts();

  return <WishlistClient products={products} />;
}
