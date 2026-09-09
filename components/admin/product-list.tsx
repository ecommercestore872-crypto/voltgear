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

function ProductRows({ products }: { products: AdminProduct[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Stock</th>
            <th className="px-3 py-2 font-medium">Price</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id} className="border-b last:border-0">
              <td className="px-3 py-2">
                <Link
                  href={`/admin/products/${p._id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.images[0]}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs">
                      —
                    </span>
                  )}
                  <span>
                    <span className="block font-medium">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.slug}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-3 py-2 capitalize">
                {p.draft ? `${p.status} · draft` : p.status}
              </td>
              <td className="px-3 py-2">{p.stockStatus}</td>
              <td className="px-3 py-2">{formatPrice(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>
      <Input
        placeholder="Search name, slug, status, or category"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search products"
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
          >
            {g.name}
            <span className="ml-1 opacity-70">({g.products.length})</span>
          </Button>
        ))}
      </div>
      {visibleGroups.length === 0 ||
      visibleGroups.every((g) => g.products.length === 0) ? (
        <p className="text-sm text-muted-foreground">No products match.</p>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((g) => (
            <section key={g.slug} aria-labelledby={`cat-${g.slug}`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id={`cat-${g.slug}`}
                  className="text-lg font-semibold tracking-tight"
                >
                  {g.name}
                </h2>
                <Link
                  href={`/admin/categories`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Shop types
                </Link>
              </div>
              {g.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No products in this type yet.{" "}
                  <Link href="/admin/products/new" className="underline">
                    Add one
                  </Link>
                </p>
              ) : (
                <ProductRows products={g.products} />
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
