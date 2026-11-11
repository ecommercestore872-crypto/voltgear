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

import { mergeRetainedSku } from "@/lib/cart-sku-rules";
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
  hydrated: boolean;
  hydrateCart: () => void;
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
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const hydratedRef = useRef(false);

  const hydrateCart = useCallback(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems((prev) => (prev.length === 0 ? parsed : prev));
        }
      }
    } catch {
      // Storage may be unavailable in an in-app browser.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const init = () => {
      if (!cancelled) hydrateCart();
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
  }, [hydrateCart]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {
      // Keep the cart usable for this tab when persistence is denied.
    }
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      // Hydration/restoration uses setItems from localStorage — never this path.
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) return;
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

  const removeItem = useCallback(
    (key: string) => {
      setItems((prev) => prev.filter((i) => cartLineKey(i) !== key));
    },
    [],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => cartLineKey(i) !== key)
          : prev.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i)),
      );
    },
    [],
  );

  const updateItemPrice = useCallback((key: string, price: number) => {
    setItems((prev) =>
      prev.map((i) => (cartLineKey(i) === key ? { ...i, price } : i)),
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
      { count: 0, subtotal: 0 },
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      hydrated,
      hydrateCart,
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
    [
      items,
      hydrated,
      hydrateCart,
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
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

const SSR_CART: CartContextValue = {
  items: [],
  hydrated: false,
  hydrateCart: () => {},
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
