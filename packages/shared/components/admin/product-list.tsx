"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShopType } from "@/lib/categories";
import type { AdminProduct } from "@/lib/db/admin-types";
import { formatPrice } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export function adminProductsHref(opts: {
  q?: string;
  stock?: string;
  page?: number;
  category?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.stock === "attention") params.set("stock", "attention");
  const q = opts.q?.trim() ?? "";
  if (q.length >= 2) params.set("q", q);
  if (opts.category && opts.category !== "all") params.set("category", opts.category);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

function ProductStatusBadge({
  status,
  draft,
  hasUnpublishedDraft,
}: {
  status: string;
  draft: unknown;
  hasUnpublishedDraft?: boolean;
}) {
  const pendingChanges = Boolean(draft) || Boolean(hasUnpublishedDraft);
  if (status === "published" || status === "active") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shadow-sm bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
          Published
        </span>
        {pendingChanges ? (
          <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-widest" title="Has unpublished changes">*Draft</span>
        ) : null}
      </div>
    );
  }
  
  if (status === "draft" || pendingChanges) {
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
              <ProductStatusBadge
                status={p.status}
                draft={p.draft}
                hasUnpublishedDraft={p.hasUnpublishedDraft}
              />
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
                  <ProductStatusBadge
                status={p.status}
                draft={p.draft}
                hasUnpublishedDraft={p.hasUnpublishedDraft}
              />
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
  serverQuery = "",
  totalCount,
  page = 1,
  pageSize,
  serverCategory,
  categoryCounts = [],
}: {
  products: AdminProduct[];
  shopTypes: ShopType[];
  stockFilter?: string;
  serverQuery?: string;
  totalCount: number;
  page?: number;
  pageSize: number;
  serverCategory?: string;
  categoryCounts?: { slug: string; count: number }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(serverQuery);
  const queryRef = useRef(q);
  queryRef.current = q;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationRef = useRef({ revision: 0, pending: new Map<string, number>() });
  const routeRef = useRef({ stock: stockFilter, category: serverCategory, page });
  routeRef.current = { stock: stockFilter, category: serverCategory, page };
  const committedHref = adminProductsHref({
    stock: stockFilter, category: serverCategory, page, q: serverQuery,
  });

  const cancelPendingSearch = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    const state = navigationRef.current;
    const submittedRevision = state.pending.get(committedHref);
    if (submittedRevision !== undefined && submittedRevision < state.revision) {
      state.pending.delete(committedHref);
      return; // An older response must not erase newer edits or their debounce.
    }
    navigationRef.current = { revision: state.revision + 1, pending: new Map() };
    cancelPendingSearch();
    queryRef.current = serverQuery;
    setQ(serverQuery);
  }, [committedHref, serverQuery, cancelPendingSearch]);

  useEffect(() => {
    const resetNavigation = () => {
      cancelPendingSearch();
      navigationRef.current = { revision: 0, pending: new Map() };
    };
    window.addEventListener("popstate", resetNavigation);
    return () => {
      window.removeEventListener("popstate", resetNavigation);
      cancelPendingSearch();
    };
  }, [cancelPendingSearch]);

  function navigate(next: Parameters<typeof adminProductsHref>[0]) {
    cancelPendingSearch();
    const href = adminProductsHref({ ...routeRef.current, q: queryRef.current, ...next });
    const state = navigationRef.current;
    state.revision++;
    state.pending.delete(href);
    state.pending.set(href, state.revision);
    if (state.pending.size > 32) state.pending.delete(state.pending.keys().next().value!);
    router.replace(href);
  }

  function handleSearchChange(value: string) {
    navigationRef.current.revision++;
    queryRef.current = value;
    setQ(value);
    cancelPendingSearch();
    debounceRef.current = setTimeout(() => navigate({ q: value, page: 1 }), 450);
  }

  const shopTypeBySlug = useMemo(
    () => new Map(shopTypes.map((t) => [t.slug, t.name])),
    [shopTypes],
  );

  const categoryChips = categoryCounts.map((c) => ({
    slug: c.slug,
    name: shopTypeBySlug.get(c.slug) ?? c.slug,
    count: c.count,
  }));
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-4 border-b border-border/60 bg-[var(--g-cream)]/95 px-4 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div className="relative w-full max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <Input
            placeholder="Search name, slug, or category (2+ characters)"
            value={q}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search products"
            className="h-10 pl-9 shadow-sm bg-white dark:bg-zinc-900/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {totalCount.toLocaleString()} products
          {stockFilter === "attention" ? " needing stock attention" : ""}
          {serverCategory ? ` in ${shopTypeBySlug.get(serverCategory) ?? serverCategory}` : ""}
          {serverQuery ? ` matching "${serverQuery}"` : ""}
          {" · "}
          page {page} of {totalPages} ({products.length} on this page). Type 2+ characters to search.
        </p>
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <Button
            type="button"
            size="sm"
            variant={!serverCategory ? "default" : "secondary"}
            onClick={() => navigate({ category: "all", page: 1 })}
            className={`shadow-sm rounded-full px-4 transition-all ${!serverCategory ? "" : "bg-muted/50 hover:bg-muted"}`}
          >
            All
          </Button>
          {categoryChips.map((g) => (
            <Button
              key={g.slug}
              type="button"
              size="sm"
              variant={serverCategory === g.slug ? "default" : "secondary"}
              onClick={() => navigate({ category: g.slug, page: 1 })}
              title={`${g.count} products in this catalog category`}
              className={`shadow-sm rounded-full px-4 transition-all ${serverCategory === g.slug ? "" : "bg-muted/50 hover:bg-muted"}`}
            >
              {g.name}
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${serverCategory === g.slug ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground"}`}>
                {g.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 p-12 text-center text-sm text-muted-foreground bg-muted/10">
          <p>No products match your search or filter.</p>
          {(q.trim() || serverCategory || stockFilter) ? (
            <Button
              type="button"
              variant="link"
              className="mt-2"
              onClick={() => {
                setQ("");
                queryRef.current = "";
                navigate({ q: "", category: "all", stock: "", page: 1 });
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : (
        <ProductRows products={products} />
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ q: serverQuery, page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate({ q: serverQuery, page: page + 1 })}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
