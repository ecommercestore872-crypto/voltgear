"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSearch(window.location.search);
    setReady(true);
    function onPopState() {
      setSearch(window.location.search);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (!ready) {
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

  return <SearchResultsClient initialSearch={search} />;
}
