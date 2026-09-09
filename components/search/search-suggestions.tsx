"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, Clock, Star } from "lucide-react";

import { fetchStoreProducts } from "@/lib/store-client";
import { imageUrl } from "@/lib/sanity/image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

const POPULAR_SEARCHES = [
  "earbuds",
  "smartwatch",
  "power bank",
  "charger",
  "wireless",
  "fast charging",
];

const RECENT_KEY = "voltgear-recent-searches";

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(q: string) {
  if (!q.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== q);
    recent.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 6)));
  } catch {}
}

export function SearchSuggestions({ query }: { query: string }) {
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
    fetchStoreProducts()
      .then((all) => {
        setBestsellers(
          all.filter((p) => p.stockStatus !== "out-of-stock").slice(0, 4),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (query) saveRecentSearch(query);
  }, [query]);

  if (query) return null;

  return (
    <div className="space-y-6">
      {recentSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Recent Searches</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Popular Searches</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>

      {bestsellers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Bestsellers</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {bestsellers.map((p) => {
              const img = p.images?.[0];
              return (
                <Link
                  key={p._id}
                  href={`/product/${p.slug}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  {img ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                      <Image
                        src={imageUrl(img, { w: 120 })}
                        alt={p.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{p.name}</p>
                    <p className="text-sm font-semibold">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
