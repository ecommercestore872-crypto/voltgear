"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

import { SearchEmptyShell } from "./search-empty-shell";

const SearchResultsClient = dynamic(
  () =>
    import("./search-results-client").then((m) => m.SearchResultsClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[40vh] bg-[var(--g-cream)]" aria-busy="true" />
    ),
  },
);

/** Static /search shell; results load in a split chunk (no CatalogView in main bundle). */
export function SearchPageClient() {
  const search = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    () => window.location.search,
    () => "",
  );

  if (!search) {
    return <SearchEmptyShell />;
  }

  const q = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  )
    .get("q")
    ?.trim();

  if (!q) {
    return <SearchEmptyShell />;
  }

  return <SearchResultsClient key={search} initialSearch={search} />;
}
