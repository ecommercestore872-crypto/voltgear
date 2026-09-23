"use client";

import { useCallback, useEffect, useState } from "react";

export interface RecentProduct {
  slug: string;
  name: string;
  price: number;
  image?: string;
  category: string;
}

const STORAGE_KEY = "voltgear-recently-viewed";
const MAX_ITEMS = 8;

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const track = useCallback((product: RecentProduct) => {
    setItems((prev) => {
      const next = [product, ...prev.filter((p) => p.slug !== product.slug)].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { items, track };
}
