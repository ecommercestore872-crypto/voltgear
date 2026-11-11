"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

import type { ShopType } from "@/lib/categories";
import { sortCatalogProducts } from "@/lib/rail-product";
import type { PublicSiteConfig } from "@/lib/site-config";
import type { Product } from "@/lib/types";

const GadgetShopCatalogDynamic = dynamic(
  () =>
    import("@/components/gadget/gadget-shop-catalog").then(
      (m) => m.GadgetShopCatalog,
    ),
  { ssr: true },
);

function hasImage(p: Product) {
  return Boolean(p.images?.[0] || p.cloudinaryImages?.[0]);
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
  children,
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
  children?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    const syncFromLocation = () => {
      const raw = typeof window !== "undefined" ? window.location.search : "";
      if (!raw) {
        setQuery((prev) => (prev !== "" ? "" : prev));
        setSort((prev) => (prev !== "featured" ? "featured" : prev));
        return;
      }
      const params = new URLSearchParams(
        raw.startsWith("?") ? raw.slice(1) : raw,
      );
      const nextQ = (params.get("q") || "").trim();
      const nextSort = params.get("sort") || "featured";
      setQuery((prev) => (prev !== nextQ ? nextQ : prev));
      setSort((prev) => (prev !== nextSort ? nextSort : prev));
    };

    const onCustomQuery = (e: Event) => {
      const detail = (e as CustomEvent<{ q?: string; sort?: string }>).detail;
      if (!detail) return;
      const nextQ = (detail.q || "").trim();
      const nextSort = detail.sort || "featured";
      setQuery((prev) => (prev !== nextQ ? nextQ : prev));
      setSort((prev) => (prev !== nextSort ? nextSort : prev));
    };

    if (typeof window !== "undefined" && window.location.search) {
      syncFromLocation();
    }
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("voltgear:catalog-query", onCustomQuery);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("voltgear:catalog-query", onCustomQuery);
    };
  }, [pathname]);

  useEffect(() => {
    const q = query.trim();
    if (activeCategory || !q) {
      setRemoteProducts(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ q, sort, page: "1" });
    fetch(`/api/catalog/search?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const items = data?.result?.items;
        setRemoteProducts(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setRemoteProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, query, sort]);

  const isDefaultView = query === "" && sort === "featured";

  const filtered = useMemo(() => {
    if (children && isDefaultView) return products;
    const qLower = query.toLowerCase();
    const useRemote = !activeCategory && qLower && remoteProducts !== null;
    let list = (useRemote ? remoteProducts : products).filter((p) =>
      hasImage(p),
    );
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (qLower && !useRemote) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(qLower) ||
          p.category.toLowerCase().includes(qLower) ||
          (p.shortDescription || "").toLowerCase().includes(qLower),
      );
    }
    return sortCatalogProducts(list, sort);
  }, [
    children,
    isDefaultView,
    products,
    remoteProducts,
    activeCategory,
    query,
    sort,
  ]);

  if (children && isDefaultView) {
    return <>{children}</>;
  }

  const hubSearchActive = !activeCategory && Boolean(query.trim());

  return (
    <GadgetShopCatalogDynamic
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
    />
  );
}
