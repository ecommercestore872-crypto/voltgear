"use client";

import { useEffect } from "react";

import { trackTikTokViewContent } from "@/lib/tiktok-browser-events";
import { trackMetaViewContent } from "@/lib/meta-pixel-events";
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
  variantSku,
  variantKey,
  metaAvailable = true,
}: {
  slug: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  productId?: string;
  sku?: string;
  variantSku?: string;
  variantKey?: string;
  metaAvailable?: boolean;
}) {
  useEffect(() => {
    let metaCleanup: (() => void) | void = undefined;
    const trackCurrentMetaView = () => {
      if (metaCleanup) metaCleanup();
      metaCleanup = trackMetaViewContent({ productId: slug, name, price, category, available: metaAvailable });
    };
    trackCurrentMetaView();
    window.addEventListener("bnt-cookie-consent-change", trackCurrentMetaView);
    window.addEventListener("meta:pixel-ready", trackCurrentMetaView);

    try {
      trackTikTokViewContent({
        slug,
        name,
        price,
        category,
        ...(sku ? { sku } : {}),
        variantSku,
        variantKey,
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

    return () => {
      window.removeEventListener("bnt-cookie-consent-change", trackCurrentMetaView);
      window.removeEventListener("meta:pixel-ready", trackCurrentMetaView);
      if (metaCleanup) {
        metaCleanup();
      }
    };
  }, [slug, name, price, image, category, productId, sku, variantSku, variantKey, metaAvailable]);

  return null;
}
