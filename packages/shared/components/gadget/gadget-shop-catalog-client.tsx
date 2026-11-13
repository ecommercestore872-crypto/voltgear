"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { GadgetShopCatalog } from "@/components/gadget/gadget-shop-catalog";
import type { ShopType } from "@/lib/categories";
import { getStockState } from "@/lib/stock";
import type { PublicSiteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";

function hasImage(p: Product) {
  return Boolean(p.images?.[0] || p.cloudinaryImages?.[0]);
}

function sortProducts(list: Product[], sort: string) {
  const sorted = [...list].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return (
      Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)
    );
  });
  return [
    ...sorted.filter((p) => !getStockState(p.stockStatus).soldOut),
    ...sorted.filter((p) => getStockState(p.stockStatus).soldOut),
  ];
}

/**
 * Client filter/sort so the server page can stay ISR-cacheable
 * (no searchParams / cookies on the RSC page).
 */
export function GadgetShopCatalogClient({
  products,
  shopTypes,
  config,
  title,
  description,
  breadcrumbs,
  activeCategory,
  basePath,
  flattenGrid,
  guideLink,
  maxPerCategory,
}: {
  products: Product[];
  shopTypes: ShopType[];
  config: PublicSiteConfig;
  title: string;
  description: string;
  breadcrumbs: { label: string; href?: string }[];
  activeCategory?: string | null;
  basePath?: string;
  flattenGrid?: boolean;
  guideLink?: { href: string; label: string } | null;
  maxPerCategory?: number;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const pathname = usePathname();
  const [remoteResult, setRemoteResult] = useState<{
    key: string;
    items: Product[];
  } | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const searchKey = `${query}\u0000${sort}`;

  useEffect(() => {
    function readUrlFilters() {
      const params = new URLSearchParams(window.location.search);
      setQuery((params.get("q") || "").trim());
      setSort(params.get("sort") || "featured");
    }
    readUrlFilters();
    window.addEventListener("popstate", readUrlFilters);
    return () => window.removeEventListener("popstate", readUrlFilters);
  }, [pathname]);

  useEffect(() => {
    const q = query.trim();
    if (activeCategory || !q) {
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ q, sort, page: "1" });
    fetch(`/api/catalog/search?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const items = data?.result?.items;
        if (!Array.isArray(items)) throw new Error("Invalid search response");
        setRemoteResult({ key: searchKey, items });
        setFailedQuery(null);
      })
      .catch(() => {
        if (!cancelled) setFailedQuery(searchKey);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, query, sort, searchKey, searchAttempt]);

  const filtered = useMemo(() => {
    const qLower = query.toLowerCase();
    const searchAll = !activeCategory && Boolean(qLower);
    const remoteProducts = remoteResult?.key === searchKey ? remoteResult.items : null;
    let list = (searchAll ? remoteProducts ?? [] : products).filter((p) =>
      hasImage(p),
    );
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (qLower && !searchAll) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(qLower) ||
          p.category.toLowerCase().includes(qLower) ||
          (p.shortDescription || "").toLowerCase().includes(qLower),
      );
    }
    return sortProducts(list, sort);
  }, [products, remoteResult, searchKey, activeCategory, query, sort]);

  const hubSearchActive = !activeCategory && Boolean(query.trim());
  const searchLoading = hubSearchActive && remoteResult?.key !== searchKey && failedQuery !== searchKey;
  const searchError = hubSearchActive && failedQuery === searchKey;

  return (
    <GadgetShopCatalog
      title={title}
      description={description}
      products={filtered}
      shopTypes={shopTypes}
      activeCategory={activeCategory}
      query={query}
      sort={sort}
      config={config}
      breadcrumbs={breadcrumbs}
      basePath={basePath}
      flattenGrid={flattenGrid || hubSearchActive}
      guideLink={guideLink}
      maxPerCategory={maxPerCategory}
      searchLoading={searchLoading}
      searchError={searchError}
      onSearchRetry={() => {
        setFailedQuery(null);
        setSearchAttempt((attempt) => attempt + 1);
      }}
      onFiltersChange={(nextQuery, nextSort) => {
        setQuery(nextQuery);
        setSort(nextSort);
      }}
    />
  );
}
