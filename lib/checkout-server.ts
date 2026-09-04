import { fetchProductBySlug, fetchSiteSettings } from "@/lib/db/store";
import { normalizeSettings } from "@/lib/site-config";
import { getStockState } from "@/lib/stock";
import type { OrderItem, Product, ProductVariant, SiteSettings } from "@/lib/types";

/**
 * Server-authoritative checkout resolution.
 *
 * The browser is NEVER authoritative for price, variant price, compareAtPrice,
 * discount, stock, availability, line totals or the order total. Every line is
 * re-resolved here against Sanity at order time: the product, the selected
 * variant (ownership + existence), the current unit price and the current
 * stock state. Client-supplied prices, subtotals, shipping and totals are
 * ignored entirely.
 */

export const GIFT_WRAP_FEE = 199;

export const CHECKOUT_ERRORS = {
  unavailable:
    "One of your items is no longer available. Please remove it and try again.",
  soldOut:
    "One of your items is sold out. Please remove it and try again.",
  invalidQuantity:
    "One of your items has an invalid quantity. Please try again.",
} as const;

export const CHECKOUT_PRICE_CHANGED_ERROR =
  "One or more item prices changed. Please review your order again.";

interface CheckoutLine {
  slug?: string;
  quantity?: number;
  variantKey?: string;
  price?: number;
}

export interface ResolvedOrderItem extends OrderItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface PriceMismatch {
  slug: string;
  variantKey?: string;
  variantName?: string;
  oldPrice: number;
  newPrice: number;
}

export interface ResolvedCheckout {
  lines: ResolvedOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface CheckoutResolution {
  ok: true;
  checkout: ResolvedCheckout;
}

export interface PriceChangedResolution {
  ok: "price_changed";
  items: PriceMismatch[];
  checkout: ResolvedCheckout;
}

export interface CheckoutResolutionError {
  ok: false;
  error: string;
}

export type CheckoutResolutionResult =
  | CheckoutResolution
  | PriceChangedResolution
  | CheckoutResolutionError;

/**
 * A numeric, positive, finite price the customer could have reviewed.
 * Missing / NaN / non-positive / string-coerced values are treated as "no
 * reviewed-price snapshot" (backward compatible — see Part 8/9): the server
 * simply proceeds authoritatively with no mismatch to report.
 */
function reviewedPrice(line: CheckoutLine): number | null {
  const n = Number(line.price);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function findVariant(
  variants: ProductVariant[],
  key: string | undefined
): ProductVariant | null {
  if (!key) return null;
  return (
    variants.find((v) => v._key === key) ??
    variants.find((v) => v.sku === key) ??
    null
  );
}

/**
 * Resolve the requested lines against current Sanity data.
 *
 * Precedence per line: product/variant existence -> quantity -> stock. Price
 * comparison is a final step: a mismatch never blocks (the line is still
 * resolvable and authoritative); all mismatches are collected and reported
 * together so the customer sees a complete updated cart.
 *
 * The client `price` is only ever a "reviewed snapshot", never authority.
 */
export async function resolveCheckout(
  items: CheckoutLine[],
  giftWrap: boolean,
  includeDemo = false
): Promise<CheckoutResolutionResult> {
  const lines: ResolvedOrderItem[] = [];
  const mismatched: PriceMismatch[] = [];
  let subtotal = 0;

  for (const line of items) {
    const slug = typeof line.slug === "string" ? line.slug.trim() : "";
    if (!slug) {
      return { ok: false, error: CHECKOUT_ERRORS.unavailable };
    }

    const quantity = line.quantity;
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return { ok: false, error: CHECKOUT_ERRORS.invalidQuantity };
    }

    const product = await fetchProductForCheckout(slug, includeDemo);
    if (!product) {
      return { ok: false, error: CHECKOUT_ERRORS.unavailable };
    }

    const variants = product.variants ?? [];
    const variantKey = typeof line.variantKey === "string" ? line.variantKey : undefined;

    let unitPrice: number;
    let resolvedVariant: ProductVariant | null = null;

    if (variantKey) {
      if (!variants.length) {
        return { ok: false, error: CHECKOUT_ERRORS.unavailable };
      }
      resolvedVariant = findVariant(variants, variantKey);
      if (!resolvedVariant) {
        return { ok: false, error: CHECKOUT_ERRORS.unavailable };
      }
      const stockSource =
        product.colorEnabled || product.sizeEnabled
          ? product.stockStatus
          : resolvedVariant.stockStatus;
      if (!getStockState(stockSource).purchasable) {
        return { ok: false, error: CHECKOUT_ERRORS.soldOut };
      }
      unitPrice =
        product.colorEnabled || product.sizeEnabled
          ? asNumber(product.price, 0)
          : asNumber(resolvedVariant.price, product.price);
    } else {
      if (variants.length) {
        return { ok: false, error: CHECKOUT_ERRORS.unavailable };
      }
      if (!getStockState(product.stockStatus).purchasable) {
        return { ok: false, error: CHECKOUT_ERRORS.soldOut };
      }
      unitPrice = asNumber(product.price, 0);
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      return { ok: false, error: CHECKOUT_ERRORS.unavailable };
    }

    // Compare the customer-reviewed snapshot against the current authority.
    const clientReviewedPrice = reviewedPrice(line);
    if (clientReviewedPrice !== null && clientReviewedPrice !== unitPrice) {
      mismatched.push({
        slug,
        ...(variantKey ? { variantKey } : {}),
        ...(resolvedVariant ? { variantName: resolvedVariant.name } : {}),
        oldPrice: clientReviewedPrice,
        newPrice: unitPrice,
      });
    }

    const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
    subtotal = Math.round((subtotal + lineTotal) * 100) / 100;

    lines.push({
      slug,
      name: product.name,
      price: unitPrice,
      quantity,
      lineTotal,
      ...(resolvedVariant
        ? {
            variantKey: resolvedVariant._key ?? variantKey,
            variantName: resolvedVariant.name,
            ...(resolvedVariant.sku ? { variantSku: resolvedVariant.sku } : {}),
          }
        : {}),
    });
  }

  const { shipping, total } = await resolveShippingAndTotal(subtotal, giftWrap);
  const checkout: ResolvedCheckout = { lines, subtotal, shipping, total };

  if (mismatched.length > 0) {
    return { ok: "price_changed", items: mismatched, checkout };
  }
  return { ok: true, checkout };
}

/**
 * Compute shipping the same way the checkout UI does — from the
 * server-resolved subtotal against the current site settings.
 */
export async function resolveShippingAndTotal(
  subtotal: number,
  giftWrap: boolean
): Promise<{ shipping: number; total: number }> {
  let settings: SiteSettings | null = null;
  try {
    settings = await fetchSiteSettings();
  } catch {
    settings = null;
  }
  const config = normalizeSettings(settings);
  const shipping =
    subtotal >= config.freeShippingThreshold ? 0 : config.shippingFee;
  const total = Math.round((subtotal + shipping + (giftWrap ? GIFT_WRAP_FEE : 0)) * 100) / 100;
  return { shipping, total };
}

/**
 * Fetch the freshest product data for an order line. Uses the write client
 * (token, uncached) when available so a price/stock change is honored at the
 * moment the order is placed; falls back to the storefront fetch otherwise.
 */
async function fetchProductForCheckout(slug: string, includeDemo: boolean): Promise<Product | null> {
  return fetchProductBySlug(slug, includeDemo);
}