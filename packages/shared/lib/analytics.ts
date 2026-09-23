/**
 * Client-side analytics helper for GA4 (dataLayer) + ad-hoc events.
 * GA4 loads in the root layout only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set;
 * these events are safe to call regardless.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

function push(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ...params });
}

export function trackViewItem(item: AnalyticsItem) {
  push("view_item", { ecommerce: { items: [item] } });
}

export function trackAddToCart(item: AnalyticsItem) {
  push("add_to_cart", { ecommerce: { items: [item] } });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number) {
  push("begin_checkout", {
    currency: "PKR",
    value,
    ecommerce: { items, value, currency: "PKR" },
  });
}

export function trackPurchase(
  transactionId: string,
  items: AnalyticsItem[],
  value: number
) {
  push("purchase", {
    transaction_id: transactionId,
    currency: "PKR",
    value,
    ecommerce: { transaction_id: transactionId, items, value, currency: "PKR" },
  });
}

export function trackSearch(query: string) {
  push("search", { search_term: query });
}
