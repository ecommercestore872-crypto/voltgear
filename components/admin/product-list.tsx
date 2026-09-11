"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShopType } from "@/lib/categories";
import type { AdminProduct } from "@/lib/db/admin-types";
import { productMatchesStockAttention } from "@/lib/db/dashboard-rules";
import { groupProductsByCategory } from "@/lib/db/product-list-group-rules";
import { formatPrice } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

function ProductStatusBadge({ status, draft }: { status: string; draft: any }) {
  if (status === "published" || status === "active") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
          Published
        </span>
        {draft ? (
          <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest" title="Has unpublished changes">*Draft</span>
        ) : null}
      </div>
    );
  }
  
  if (status === "draft" || draft) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
        Draft
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-700 dark:text-gray-300 ring-1 ring-gray-500/30">
      {status}
    </span>
  );
}

function StockBadge({ stock }: { stock: string }) {
  if (stock === "out-of-stock") {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30">
        Out of Stock
      </span>
    );
  }
  if (stock === "low-stock" || stock === "attention") {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30">
        Low Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
      In Stock
    </span>
  );
}

function ProductRows({ products }: { products: AdminProduct[] }) {
  return (
    <div className="space-y-4">
      {/* Mobile view */}
      <div className="grid grid-cols-1 gap-4 sm:hidden">
        {products.map((p) => (
          <Link
            key={p._id}
            href={`/admin/products/${p._id}`}
            className="flex flex-col gap-3 rounded-2xl border bg-white/70 p-4 shadow-sm backdrop-blur-xl transition hover:shadow-md dark:bg-zinc-900/70"
          >
            <div className="flex items-start gap-4">
              {p.images[0] ? (
                <img
                  src={p.images[0]}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border text-xs text-muted-foreground">
                  No Image
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="block font-semibold text-foreground truncate text-base">{p.name}</span>
                <span className="block text-sm font-medium text-foreground mt-0.5 tabular-nums">{formatPrice(p.price)}</span>
                <span className="block text-xs text-muted-foreground truncate opacity-70 mt-1">{p.slug}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <ProductStatusBadge status={p.status} draft={p.draft} />
              <StockBadge stock={p.stockStatus} />
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Product</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Stock</th>
              <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p._id} className="group hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${p._id}`}
                    className="flex items-center gap-3 w-max"
                  >
                    {p.images[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-border group-hover:ring-primary/20 transition-all"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted ring-1 ring-border text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                    <div>
                      <span className="block font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {p.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {p.slug}
                      </span>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 align-middle">
                  <ProductStatusBadge status={p.status} draft={p.draft} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <StockBadge stock={p.stockStatus} />
                </td>
                <td className="px-4 py-3 align-middle text-right font-medium tabular-nums text-foreground">
                  {formatPrice(p.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductList({
  products,
  shopTypes,
  stockFilter,
}: {
  products: AdminProduct[];
  shopTypes: ShopType[];
  stockFilter?: string;
}) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const byStock =
      stockFilter === "attention"
        ? products.filter((p) => productMatchesStockAttention(p.stockStatus))
        : products;
    const needle = q.trim().toLowerCase();
    if (!needle) return byStock;
    return byStock.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.status.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }, [products, q, stockFilter]);

  const groups = useMemo(
    () =>
      groupProductsByCategory(
        filtered,
        shopTypes.map((t) => ({ slug: t.slug, name: t.name })),
      ),
    [filtered, shopTypes],
  );

  const visibleGroups =
    categoryFilter === "all"
      ? groups
      : groups.filter((g) => g.slug === categoryFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Products
            <Badge variant="outline" className="font-normal text-muted-foreground hidden sm:inline-flex">
              Catalog Manager
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Control your storefront inventory, organize items into dynamic categories, and continuously update global pricing. Instantly identify low-stock risks or publish newly drafted collections directly from this hub.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/admin/products/new">Add Product</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          placeholder="Search name, slug, status, or category"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search products"
          className="max-w-md h-10 shadow-sm"
        />
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <Button
            type="button"
            size="sm"
            variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => setCategoryFilter("all")}
            className="shadow-sm"
          >
            All
          </Button>
          {groups.map((g) => (
            <Button
              key={g.slug}
              type="button"
              size="sm"
              variant={categoryFilter === g.slug ? "default" : "outline"}
              onClick={() => setCategoryFilter(g.slug)}
              className="shadow-sm"
            >
              {g.name}
              <span className="ml-1 opacity-70">({g.products.length})</span>
            </Button>
          ))}
        </div>
      </div>

      {visibleGroups.length === 0 || visibleGroups.every((g) => g.products.length === 0) ? (
        <div className="rounded-xl border border-dashed border-border/50 p-12 text-center text-sm text-muted-foreground bg-muted/10">
          No products match your search or filter.
        </div>
      ) : (
        <div className="space-y-10">
          {visibleGroups.map((g) => {
            if (g.products.length === 0) return null;
            return (
              <section key={g.slug} aria-labelledby={`cat-${g.slug}`}>
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
                  <h2
                    id={`cat-${g.slug}`}
                    className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2"
                  >
                    {g.name}
                    <Badge variant="outline" className="text-muted-foreground">{g.products.length}</Badge>
                  </h2>
                  <Link
                    href={`/admin/categories`}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition-all"
                  >
                    Manage Categories
                  </Link>
                </div>
                <ProductRows products={g.products} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
