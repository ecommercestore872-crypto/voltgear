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

  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(
      raw.startsWith("?") ? raw.slice(1) : raw,
    );
    setQuery((params.get("q") || "").trim());
    setSort(params.get("sort") || "featured");
  }, [pathname]);

  const filtered = useMemo(() => {
    const qLower = query.toLowerCase();
    let list = products.filter((p) => hasImage(p));
    if (activeCategory) {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (qLower) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(qLower) ||
          p.category.toLowerCase().includes(qLower) ||
          (p.shortDescription || "").toLowerCase().includes(qLower),
      );
    }
    return sortProducts(list, sort);
  }, [products, activeCategory, query, sort]);

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
      flattenGrid={flattenGrid}
      guideLink={guideLink}
      maxPerCategory={maxPerCategory}
    />
  );
}
