"use client";

import { useEffect } from "react";

import { recordStorefrontSearch } from "@/lib/storefront-search";

/** Fires once when search results are shown for a non-empty query. */
export function SearchExecutedTracker({ query }: { query: string }) {
  useEffect(() => {
    recordStorefrontSearch(query);
  }, [query]);
  return null;
}
