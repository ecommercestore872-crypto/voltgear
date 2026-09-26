/** Admin orders list + search helpers (pure, testable). */

export const ADMIN_ORDERS_PAGE_SIZE = 50;
export const ADMIN_ORDER_SEARCH_MAX_LEN = 80;

export type AdminOrderTabCounts = {
  all: number;
  new: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export function sanitizeAdminOrderSearchTerm(term: string): string {
  return term.trim().replace(/[%]/g, "").slice(0, ADMIN_ORDER_SEARCH_MAX_LEN);
}

export function adminOrderSearchPattern(term: string): string | null {
  const cleaned = sanitizeAdminOrderSearchTerm(term);
  if (cleaned.length < 2) return null;
  return `%${cleaned}%`;
}

export function normalizeAdminOrdersPage(page: unknown): number {
  const n = typeof page === "string" ? parseInt(page, 10) : Number(page);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function adminOrdersRange(page: number, pageSize = ADMIN_ORDERS_PAGE_SIZE): {
  from: number;
  to: number;
} {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

/** Maps orders UI tab to DB `status` filter (null = all). */
export function adminOrdersStatusForTab(
  tab: string | null | undefined,
): string | null {
  if (!tab || tab === "all") return null;
  if (
    tab === "new" ||
    tab === "processing" ||
    tab === "shipped" ||
    tab === "delivered" ||
    tab === "cancelled"
  ) {
    return tab;
  }
  return null;
}
