"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CART_STORAGE_KEY,
  mergeCartHydration,
  parseCartStorage,
} from "@/lib/cart-hydration-rules";
import { mergeRetainedSku } from "@/lib/cart-sku-rules";
import { isPurchasablePrice } from "@/lib/product-price-rules";
import { trackTikTokAddToCart } from "@/lib/tiktok-browser-events";
import { trackMetaAddToCart } from "@/lib/meta-pixel-events";

export interface CartItem {
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  /** Product-level SKU when known (TikTok content_id); optional for legacy carts. */
  sku?: string;
  variantKey?: string;
  variantName?: string;
  variantSku?: string;
  productId?: string;
  variantId?: string;
  freeShipping?: boolean;
}

/**
 * Identity of a cart line. Products without variants use the slug alone;
 * variant lines are keyed by `slug::variantKey` so two variants of the
 * same product never merge into one line (and one variant never merges
 * into the base line).
 */
export function cartLineKey(item: {
  slug: string;
  variantKey?: string;
}): string {
  return item.variantKey ? `${item.slug}::${item.variantKey}` : item.slug;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  updateItemPrice: (key: string, price: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function writeCartStorage(next: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota — fail open
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = parseCartStorage(
      localStorage.getItem(CART_STORAGE_KEY),
    ) as CartItem[];
    // Pure updater only — persist via useLayoutEffect after commit.
    setItems((current) => mergeCartHydration(current, stored) as CartItem[]);
    setHydrated(true);
  }, []);

  // Layout persist: flush before paint / before Playwright navigates away.
  useLayoutEffect(() => {
    if (!hydrated) return;
    writeCartStorage(items);
  }, [items, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.cartHydrated = hydrated ? "true" : "false";
    document.documentElement.dataset.cartCount = String(
      items.reduce((n, i) => n + i.quantity, 0),
    );
  }, [hydrated, items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      // Hydration/restoration uses setItems from localStorage — never this path.
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) return;
      if (!isPurchasablePrice(item.price)) return;
      setItems((prev) => {
        const key = cartLineKey(item);
        const existing = prev.find((i) => cartLineKey(i) === key);
        if (existing) {
          return prev.map((i) =>
            cartLineKey(i) === key
              ? {
                  ...i,
                  quantity: i.quantity + qty,
                  productId: i.productId ?? item.productId,
                  variantId: i.variantId ?? item.variantId,
                  sku: mergeRetainedSku(i.sku, item.sku),
                  variantSku: mergeRetainedSku(i.variantSku, item.variantSku),
                }
              : i,
          );
        }
        return [...prev, { ...item, quantity: qty }];
      });
      try {
        trackMetaAddToCart({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: qty,
        });
      } catch {
        // fail-open
      }

      try {
        trackTikTokAddToCart({
          slug: item.slug,
          name: item.name,
          price: item.price,
          quantity: qty,
          ...(item.sku ? { sku: item.sku } : {}),
          ...(item.variantSku ? { variantSku: item.variantSku } : {}),
          ...(item.variantKey ? { variantKey: item.variantKey } : {}),
        });
      } catch {
        // fail-open
      }
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => cartLineKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => cartLineKey(i) !== key)
        : prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i)),
    );
  }, []);

  const updateItemPrice = useCallback((key: string, price: number) => {
    setItems((prev) =>
      prev.map((i) => (cartLineKey(i) === key ? { ...i, price } : i)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const { count, subtotal } = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.count += item.quantity;
        acc.subtotal += item.price * item.quantity;
        return acc;
      },
      { count: 0, subtotal: 0 },
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      hydrated,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateItemPrice,
      clearCart,
    }),
    [
      items,
      count,
      subtotal,
      hydrated,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateItemPrice,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const SSR_CART: CartContextValue = {
  items: [],
  count: 0,
  subtotal: 0,
  hydrated: false,
  isOpen: false,
  openCart: () => {},
  closeCart: () => {},
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  updateItemPrice: () => {},
  clearCart: () => {},
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    if (typeof window === "undefined") return SSR_CART;
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
