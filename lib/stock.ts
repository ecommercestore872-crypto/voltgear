import type { Product, ProductVariant, StockStatus } from "@/lib/types";

export interface StockState {
  status: StockStatus;
  label: string;
  badgeVariant: "success" | "warning" | "destructive";
  purchasable: boolean;
  soldOut: boolean;
}

/**
 * Single source of truth for product stock interpretation across the PDP,
 * Add to Cart, sticky CTA, product cards, quick view and the homepage hero.
 *
 * Core states:
 *   in-stock    → purchasable
 *   low-stock   → purchasable, "Low Stock" warning (no quantities invented)
 *   out-of-stock→ "Sold Out", purchase controls disabled — never labelled
 *                 "Pre-Order" unless a real preorder lifecycle exists.
 */
export function getStockState(
  stockStatus: StockStatus | undefined | null
): StockState {
  switch (stockStatus) {
    case "low-stock":
      return {
        status: "low-stock",
        label: "Low Stock",
        badgeVariant: "warning",
        purchasable: true,
        soldOut: false,
      };
    case "out-of-stock":
      return {
        status: "out-of-stock",
        label: "Sold Out",
        badgeVariant: "destructive",
        purchasable: false,
        soldOut: true,
      };
    default:
      return {
        status: "in-stock",
        label: "In Stock",
        badgeVariant: "success",
        purchasable: true,
        soldOut: false,
      };
  }
}

/**
 * Stock state for a specific variant (falls back to the product-level state).
 */
export function getVariantStockState(
  product: Product,
  variant?: ProductVariant | null
): StockState {
  if (product.colorEnabled || product.sizeEnabled) {
    return getStockState(product.stockStatus);
  }
  if (variant?.stockStatus) return getStockState(variant.stockStatus);
  return getStockState(product.stockStatus);
}

/**
 * The effective purchasability of the product given its selected variant.
 */
export function isPurchasable(
  product: Product,
  variant?: ProductVariant | null
): boolean {
  return getVariantStockState(product, variant).purchasable;
}

/**
 * The unambiguous default variant, when the product has variants and exactly
 * one of them is flagged `isDefault`. Returns null for non-variant products,
 * for variant products without a default flag, and when multiple variants
 * claim the default — so callers never auto-select an arbitrary variant.
 */
export function getDefaultVariant(product: Product): ProductVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;
  const flagged = variants.filter((v) => v.isDefault === true);
  return flagged.length === 1 ? flagged[0] : null;
}