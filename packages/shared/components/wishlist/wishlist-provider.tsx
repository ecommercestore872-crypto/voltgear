"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { trackTikTokAddToWishlist } from "@/lib/tiktok-browser-events";

export interface WishlistItem {
  slug: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  sku?: string;
}

function trackWishlistAdd(item: WishlistItem) {
  try {
    trackTikTokAddToWishlist({
      slug: item.slug,
      name: item.name,
      price: item.price,
      ...(item.category ? { category: item.category } : {}),
      ...(item.sku ? { sku: item.sku } : {}),
    });
  } catch {
    // fail-open
  }
}

interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  hydrated: boolean;
  hasItem: (slug: string) => boolean;
  addItem: (item: WishlistItem) => void;
  removeItem: (slug: string) => void;
  toggleItem: (item: WishlistItem) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "voltgear-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (cancelled || hydratedRef.current) return;
      hydratedRef.current = true;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems((prev) => (prev.length === 0 ? parsed : prev));
          }
        }
      } catch {}
    };

    const timer = setTimeout(init, 6000);
    window.addEventListener("pointerdown", init, { once: true, passive: true });
    window.addEventListener("keydown", init, { once: true, passive: true });
    window.addEventListener("touchstart", init, { once: true, passive: true });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("pointerdown", init);
      window.removeEventListener("keydown", init);
      window.removeEventListener("touchstart", init);
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.slug === item.slug)) return prev;
      queueMicrotask(() => trackWishlistAdd(item));
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const toggleItem = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.slug === item.slug)) {
        return prev.filter((i) => i.slug !== item.slug);
      }
      queueMicrotask(() => trackWishlistAdd(item));
      return [...prev, item];
    });
  }, []);

  const hasItem = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items],
  );

  const count = items.length;

  const value = useMemo(
    () => ({
      items,
      count,
      hydrated: true,
      hasItem,
      addItem,
      removeItem,
      toggleItem,
    }),
    [items, count, hasItem, addItem, removeItem, toggleItem],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

const SSR_WISHLIST: WishlistContextValue = {
  items: [],
  count: 0,
  hydrated: false,
  hasItem: () => false,
  addItem: () => {},
  removeItem: () => {},
  toggleItem: () => {},
};

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    if (typeof window === "undefined") return SSR_WISHLIST;
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
