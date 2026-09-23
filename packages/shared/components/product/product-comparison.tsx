"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, BarChart3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/product/star-rating";
import { gadgetFontClass } from "@/components/gadget/gadget-fonts";
import { useGadgetPreview } from "@/components/gadget/use-gadget-preview";
import { product2Href, products2Href } from "@/lib/gadget-preview";
import { fetchStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

const STORAGE_KEY = "voltgear-compare";
const MAX_COMPARE = 3;

export function useCompare() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlugs(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (slugs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } else if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [slugs]);

  function toggle(slug: string) {
    setSlugs((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, slug];
    });
  }

  function clear() {
    setSlugs([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function remove(slug: string) {
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }

  return { slugs, count: slugs.length, toggle, clear, remove };
}

export function CompareBar({
  slugs,
  onClear,
  onRemove,
}: {
  slugs: string[];
  onClear: () => void;
  onRemove: (slug: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (slugs.length === 0) {
      setProducts([]);
      return;
    }
    fetchStoreProducts()
      .then((all) => setProducts(all.filter((p) => slugs.includes(p.slug))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);

  if (slugs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[80] border-t bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="container mx-auto flex items-center gap-4 lg:px-8">
        <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {products.map((p) => (
            <div
              key={p._id}
              className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/50 pl-1 pr-2"
            >
              {p.images?.[0] && (
                <div className="relative h-6 w-6 overflow-hidden rounded-full">
                  <Image
                    src={imageUrl(p.images[0], { w: 48 })}
                    alt={p.name}
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs font-medium">
                {p.name}
              </span>
              <button
                onClick={() => onRemove(p.slug)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <Button asChild size="sm" disabled={slugs.length < 2}>
          <Link href={`/compare?products=${slugs.join(",")}`}>
            Compare ({slugs.length})
          </Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

export function CompareButton({ slug }: { slug: string }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const active = slugs.includes(slug);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlugs(JSON.parse(raw));
    } catch {}
  }, []);

  function toggle() {
    setSlugs((prev) => {
      let next: string[];
      if (prev.includes(slug)) {
        next = prev.filter((s) => s !== slug);
      } else if (prev.length >= MAX_COMPARE) {
        return prev;
      } else {
        next = [...prev, slug];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("compare-updated"));
      return next;
    });
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        "absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur transition-all",
        active
          ? "bg-primary text-primary-foreground opacity-100"
          : "bg-background/90 text-foreground opacity-0 group-hover:opacity-100 hover:bg-background",
      )}
      aria-label={active ? "Remove from comparison" : "Add to comparison"}
    >
      <BarChart3 className="h-4 w-4" />
    </button>
  );
}

export function ComparePage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);
  const gadget = useGadgetPreview();
  const shopHref = gadget ? products2Href() : "/products";
  const productHref = (slug: string) =>
    gadget ? product2Href(slug) : `/product/${slug}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productsParam = params.get("products");
    if (productsParam) {
      setCompareSlugs(productsParam.split(",").filter(Boolean));
    }
    fetchStoreProducts()
      .then(setAllProducts)
      .catch(() => {});
  }, []);

  const products = allProducts.filter((p) => compareSlugs.includes(p.slug));

  if (products.length < 2) {
    return (
      <div
        className={cn(
          "container mx-auto px-4 py-12 text-center lg:px-8",
          gadget &&
            `gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`,
        )}
      >
        <BarChart3
          className={cn(
            "mx-auto h-12 w-12",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
          )}
        />
        <h1
          className={cn(
            "mt-4 text-2xl font-bold",
            gadget && "gadget-display font-semibold tracking-[-0.03em]",
          )}
        >
          Compare products
        </h1>
        <p
          className={cn(
            "mt-2",
            gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
          )}
        >
          Select at least 2 products from their cards using the comparison
          button.
        </p>
        {gadget ? (
          <Link
            href={shopHref}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--g-forest)] px-6 text-sm font-semibold text-[var(--g-white)]"
          >
            Browse products
          </Link>
        ) : (
          <Button asChild className="mt-6">
            <Link href={shopHref}>Browse Products</Link>
          </Button>
        )}
      </div>
    );
  }

  const allSpecLabels = Array.from(
    new Set(
      products.flatMap((p) => (p.specifications ?? []).map((s) => s.label)),
    ),
  );

  return (
    <div
      className={cn(
        "container mx-auto px-4 py-12 lg:px-8",
        gadget &&
          `gadget-theme ${gadgetFontClass} bg-[var(--g-cream)] text-[var(--g-charcoal)]`,
      )}
    >
      <h1
        className={cn(
          "mb-8 text-2xl font-bold",
          gadget &&
            "gadget-display font-semibold tracking-[-0.03em] sm:text-3xl",
        )}
      >
        Compare products
      </h1>
      <div
        className={cn(
          "overflow-x-auto",
          gadget &&
            "rounded-2xl border border-[var(--g-line)] bg-[var(--g-white)]",
        )}
      >
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th
                className={cn(
                  "w-40 p-3 text-left text-sm font-medium",
                  gadget ? "text-[var(--g-taupe)]" : "text-muted-foreground",
                )}
              >
                Feature
              </th>
              {products.map((p) => (
                <th key={p._id} className="p-3 text-center">
                  <div
                    className={cn(
                      "relative mx-auto mb-3 h-24 w-24 overflow-hidden rounded-lg",
                      gadget ? "bg-[var(--g-cream-deep)]" : "bg-muted",
                    )}
                  >
                    {p.images?.[0] && (
                      <Image
                        src={imageUrl(p.images[0], { w: 240 })}
                        alt={p.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <Link
                    href={productHref(p.slug)}
                    className={cn(
                      "line-clamp-2 text-sm font-semibold",
                      gadget
                        ? "hover:text-[var(--g-forest)]"
                        : "hover:text-primary",
                    )}
                  >
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm font-bold">
                    {formatPrice(p.price)}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-3 text-sm font-medium text-muted-foreground">
                Category
              </td>
              {products.map((p) => (
                <td key={p._id} className="p-3 text-center text-sm capitalize">
                  {p.category.replace("-", " ")}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <td className="p-3 text-sm font-medium text-muted-foreground">
                Rating
              </td>
              {products.map((p) => (
                <td key={p._id} className="p-3 text-center">
                  {typeof p.reviewCount === "number" && p.reviewCount > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <StarRating rating={p.rating} size={14} />
                      <span className="text-sm">({p.reviewCount})</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No ratings yet
                    </span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-t">
              <td className="p-3 text-sm font-medium text-muted-foreground">
                Availability
              </td>
              {products.map((p) => (
                <td key={p._id} className="p-3 text-center">
                  <Badge
                    variant={
                      p.stockStatus === "in-stock"
                        ? "success"
                        : p.stockStatus === "low-stock"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {p.stockStatus === "in-stock"
                      ? "In Stock"
                      : p.stockStatus === "low-stock"
                        ? "Low Stock"
                        : "Out of Stock"}
                  </Badge>
                </td>
              ))}
            </tr>
            {allSpecLabels.map((label) => (
              <tr key={label} className="border-t">
                <td className="p-3 text-sm font-medium text-muted-foreground">
                  {label}
                </td>
                {products.map((p) => {
                  const spec = (p.specifications ?? []).find(
                    (s) => s.label === label,
                  );
                  return (
                    <td key={p._id} className="p-3 text-center text-sm">
                      {spec?.value ?? "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
