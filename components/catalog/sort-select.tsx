"use client";

import { SORT_OPTIONS, type CatalogSort, buildCatalogUrl } from "@/lib/catalog";

export function SortSelect({
  basePath,
  baseParams,
  value,
}: {
  basePath: string;
  baseParams: Record<string, string>;
  value: CatalogSort;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="catalog-sort"
        className="text-sm font-medium text-foreground"
      >
        Sort by:
      </label>
      <select
        id="catalog-sort"
        name="sort"
        defaultValue={value}
        aria-label="Sort products"
        onChange={(e) => {
          const next = SORT_OPTIONS.find((o) => o.value === e.target.value);
          if (next) {
            window.location.href = buildCatalogUrl(basePath, baseParams, {
              sort: next.value,
              page: "1",
            });
          }
        }}
        className="appearance-none rounded border border-border bg-background px-3 py-1.5 pr-8 text-sm font-medium outline-none hover:border-primary focus:border-primary"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label === "Featured" ? "Recommended" : opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
