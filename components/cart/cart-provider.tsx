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

import { pageTypeFromPath, trackFirstParty } from "@/lib/first-party-analytics";

export interface CartItem {
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variantKey?: string;
  variantName?: string;
  variantSku?: string;
  productId?: string;
  variantId?: string;
}

/**
 * Identity of a cart line. Products without variants use the slug alone;
 * variant lines are keyed by `slug::variantKey` so two variants of the
 * same product never merge into one line (and one variant never merges
 * into the base line).
 */
export function cartLineKey(item: { slug: string; variantKey?: string }): string {
  return item.variantKey ? `${item.slug}::${item.variantKey}` : item.slug;
}

function trackCartLine(
  name: "add_to_cart" | "remove_from_cart",
  item: { slug: string; productId?: string; variantId?: string },
  quantity: number,
) {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  trackFirstParty({
    name,
    path,
    page_type: pageTypeFromPath(path),
    ...(item.productId ? { product_id: item.productId } : {}),
    ...(item.variantId ? { variant_id: item.variantId } : {}),
    product_slug: item.slug,
    properties: { quantity },
  });
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
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

const STORAGE_KEY = "ecomm-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const key = cartLineKey(item);
        const existing = prev.find((i) => cartLineKey(i) === key);
        if (existing) {
          return prev.map((i) =>
            cartLineKey(i) === key
              ? {
                  ...i,
                  quantity: i.quantity + quantity,
                  productId: i.productId ?? item.productId,
                  variantId: i.variantId ?? item.variantId,
                }
              : i
          );
        }
        return [...prev, { ...item, quantity }];
      });
      trackCartLine("add_to_cart", item, quantity);
    },
    []
  );

  const removeItem = useCallback(
    (key: string) => {
      const existing = items.find((i) => cartLineKey(i) === key);
      setItems((prev) => prev.filter((i) => cartLineKey(i) !== key));
      if (existing) {
        trackCartLine("remove_from_cart", existing, existing.quantity);
      }
    },
    [items]
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      const existing = items.find((i) => cartLineKey(i) === key);
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => cartLineKey(i) !== key)
          : prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i))
      );
      if (quantity <= 0 && existing) {
        trackCartLine("remove_from_cart", existing, existing.quantity);
      }
    },
    [items]
  );

  const updateItemPrice = useCallback((key: string, price: number) => {
    setItems((prev) =>
      prev.map((i) => (cartLineKey(i) === key ? { ...i, price } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const { count, subtotal } = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.count += item.quantity;
        acc.subtotal += item.price * item.quantity;
        return acc;
      },
      { count: 0, subtotal: 0 }
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      count,
      subtotal,
      isOpen,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      updateItemPrice,
      clearCart,
    }),
    [items, count, subtotal, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, updateItemPrice, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const SSR_CART: CartContextValue = {
  items: [],
  count: 0,
  subtotal: 0,
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
