"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface WishlistItem {
  slug: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
}

interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  hasItem: (slug: string) => boolean;
  addItem: (item: WishlistItem) => void;
  removeItem: (slug: string) => void;
  toggleItem: (item: WishlistItem) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "voltgear-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: WishlistItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.slug === item.slug)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const toggleItem = useCallback(
    (item: WishlistItem) => {
      setItems((prev) => {
        if (prev.some((i) => i.slug === item.slug)) {
          return prev.filter((i) => i.slug !== item.slug);
        }
        return [...prev, item];
      });
    },
    []
  );

  const hasItem = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items]
  );

  const count = items.length;

  const value = useMemo(
    () => ({ items, count, hasItem, addItem, removeItem, toggleItem }),
    [items, count, hasItem, addItem, removeItem, toggleItem]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

const SSR_WISHLIST: WishlistContextValue = {
  items: [],
  count: 0,
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
