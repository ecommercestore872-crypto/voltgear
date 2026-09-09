import Link from "next/link";

import { X } from "lucide-react";

import { buildCatalogUrl } from "@/lib/catalog";

export function ActiveFilters({
  basePath,
  baseParams, // current search params (q preserved on search, filters omitted here)
  sort,
  availability,
  minPrice,
  maxPrice,
  query,
}: {
  basePath: string;
  baseParams: Record<string, string>;
  sort: string;
  availability?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}) {
  const chips: { label: string; key: string }[] = [];
  if (query) chips.push({ label: `Search: ${query}`, key: "q" });
  if (availability && availability !== "all")
    chips.push({ label: "In Stock", key: "availability" });
  if (minPrice != null)
    chips.push({
      label: `Min Rs ${minPrice.toLocaleString()}`,
      key: "minPrice",
    });
  if (maxPrice != null)
    chips.push({
      label: `Max Rs ${maxPrice.toLocaleString()}`,
      key: "maxPrice",
    });
  if (sort && sort !== "featured")
    chips.push({ label: `Sort: ${sort}`, key: "sort" });

  if (chips.length === 0) return null;

  const remove = (key: string) => {
    const next = { ...baseParams };
    delete next[key];
    delete next.page;
    return buildCatalogUrl(basePath, next, { page: "1" });
  };
  // "Clear all" removes only catalog-filter params, preserving the search term (q).
  const withoutFilters = { ...baseParams };
  delete withoutFilters.availability;
  delete withoutFilters.minPrice;
  delete withoutFilters.maxPrice;
  delete withoutFilters.sort;
  delete withoutFilters.page;
  const clearAll = buildCatalogUrl(basePath, withoutFilters, { page: "1" });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Link
        href={clearAll}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Clear all
      </Link>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 rounded border border-input px-3 py-1 text-sm font-medium text-foreground bg-background hover:border-primary/50"
        >
          <Link
            href={remove(c.key)}
            aria-label={`Remove ${c.label}`}
            className="flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Link>
          {c.label}
        </span>
      ))}
    </div>
  );
}
