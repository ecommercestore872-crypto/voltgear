"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { CatalogBreadcrumbs } from "@/components/catalog/catalog-breadcrumbs";
import { SearchExecutedTracker } from "@/components/analytics/search-executed-tracker";
import { GadgetProductCard } from "@/components/gadget/gadget-product-card";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import type { CatalogFilters, CatalogResult } from "@/lib/catalog";
import { buildCatalogUrl } from "@/lib/catalog";
import { products2Href } from "@/lib/gadget-preview";
import type { Product } from "@/lib/types";

function parseFiltersFromSearch(search: string): CatalogFilters {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const q = (params.get("q") || "").trim();
  const sort = params.get("sort") || "featured";
  const page = Math.max(1, Number(params.get("page")) || 1);
  return {
    query: q || undefined,
    sort:
      sort === "newest" ||
      sort === "price-asc" ||
      sort === "price-desc" ||
      sort === "name-asc"
        ? sort
        : "featured",
    availability: "all",
    page,
  };
}

export function SearchResultsClient({ initialSearch }: { initialSearch: string }) {
  const [search, setSearch] = useState(initialSearch);
  const filters = useMemo(() => parseFiltersFromSearch(search), [search]);
  const q = filters.query ?? "";

  const [loading, setLoading] = useState(Boolean(q));
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: CatalogFilters) => {
    if (!f.query) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    sp.set("q", f.query);
    if (f.sort) sp.set("sort", f.sort);
    if (f.page > 1) sp.set("page", String(f.page));
    try {
      const res = await fetch(`/api/catalog/search?${sp.toString()}`);
      const body = (await res.json()) as {
        result?: CatalogResult;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "Search failed");
      setResult(body.result ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  useEffect(() => {
    function onPopState() {
      setSearch(window.location.search);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Search", current: true as const },
  ];

  if (!q) return null;

  return (
    <div
      className={`gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`}
    >
      <SearchExecutedTracker query={q} />
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
        <CatalogBreadcrumbs items={breadcrumbs} />
        <h1 className="gadget-display mt-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
          Results for &ldquo;{q}&rdquo;
        </h1>

        {loading ? (
          <div className="mt-10 flex justify-center py-16" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--g-forest)]" />
          </div>
        ) : error ? (
          <p className="mt-8 text-center text-sm text-red-600">{error}</p>
        ) : result && result.items.length === 0 ? (
          <p className="mt-8 text-center text-[var(--g-taupe)]">
            No products found for &ldquo;{q}&rdquo;.{" "}
            <Link href={products2Href()} className="font-semibold text-[var(--g-forest)]">
              Browse all products
            </Link>
          </p>
        ) : result ? (
          <>
            <div className="gadget-product-grid mt-8">
              {result.items.map((p: Product) => (
                <GadgetProductCard key={p._id} product={p} />
              ))}
            </div>
            {result.totalPages > 1 ? (
              <nav
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
                aria-label="Search pagination"
              >
                {result.page > 1 ? (
                  <Link
                    href={buildCatalogUrl("/search", { q }, { page: String(result.page - 1) })}
                    className="rounded-full border border-[var(--g-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--g-white)]"
                  >
                    Previous
                  </Link>
                ) : null}
                <span className="px-2 text-sm text-[var(--g-taupe)]">
                  Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages ? (
                  <Link
                    href={buildCatalogUrl("/search", { q }, { page: String(result.page + 1) })}
                    className="rounded-full border border-[var(--g-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--g-white)]"
                  >
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
