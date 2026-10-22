import type { Order } from "./types";

/** Live courier booking is only valid before dispatch, never for practice data. */
export const POSTEX_BOOKABLE_STATUSES = ["new", "processing"] as const;

export function canBookOrderWithPostEx(order: Pick<Order, "status" | "isDemo">): boolean {
  return !order.isDemo && POSTEX_BOOKABLE_STATUSES.some((status) => status === order.status);
}
