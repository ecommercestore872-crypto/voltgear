import { STOREFRONT_CATALOG_REVALIDATE } from "@/lib/storefront-cache";

import { SearchPageClient } from "./search-page-client";

export const revalidate = STOREFRONT_CATALOG_REVALIDATE;

export const metadata = {
  title: "Search",
  description: "Search our catalog of electronics accessories.",
  robots: { index: false, follow: true },
};

/** ISR shell — query handling is client-side to avoid dynamic SSR + heavy catalog bundle. */
export default function SearchPage() {
  return <SearchPageClient />;
}
