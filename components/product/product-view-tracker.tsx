"use client";

import { useEffect } from "react";

import { trackViewItem } from "@/lib/analytics";
import { trackFirstParty } from "@/lib/first-party-analytics";
import { trackTikTokViewContent } from "@/lib/tiktok-browser-events";
import type { RecentProduct } from "@/lib/recently-viewed";

const STORAGE_KEY = "voltgear-recently-viewed";
const MAX_ITEMS = 8;

export function ProductViewTracker({
  slug,
  name,
  price,
  image,
  category,
  productId,
  sku,
}: {
  slug: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  productId?: string;
  sku?: string;
}) {
  useEffect(() => {
    trackViewItem({ item_id: slug, item_name: name, price, quantity: 1 });
    if (productId) {
      trackFirstParty({
        name: "product_view",
        path: window.location.pathname,
        page_type: "product",
        product_id: productId,
        product_slug: slug,
      });
    }
    try {
      trackTikTokViewContent({
        slug,
        name,
        price,
        category,
        ...(sku ? { sku } : {}),
      });
    } catch {
      // fail-open
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const existing: RecentProduct[] = raw ? JSON.parse(raw) : [];
      const next = [
        { slug, name, price, image, category },
        ...existing.filter((p) => p.slug !== slug),
      ].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, [slug, name, price, image, category, productId, sku]);

  return null;
}
