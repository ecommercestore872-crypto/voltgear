/** Admin orders list + search helpers (pure, testable). */

export const ADMIN_ORDERS_PAGE_SIZE = 50;
export const ADMIN_ORDER_SEARCH_MAX_LEN = 80;

export const ADMIN_ORDERS_OPEN_STATUSES = ["new", "processing", "shipped"];

export type AdminOrdersRange = "7d" | "30d" | "90d" | "all";

export const ADMIN_ORDERS_DEFAULT_RANGE: AdminOrdersRange = "30d";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function normalizeAdminOrdersRange(value: unknown): AdminOrdersRange {
  return value === "7d" || value === "30d" || value === "90d" || value === "all"
    ? value
    : ADMIN_ORDERS_DEFAULT_RANGE;
}

/** ISO cutoff for created_at, or null for all time. */
export function adminOrdersRangeCutoff(
  range: AdminOrdersRange,
  now: Date = new Date(),
): string | null {
  const days = RANGE_DAYS[range];
  if (!days) return null;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type AdminOrderTabCounts = {
  all: number;
  open: number;
  attention: number;
  new: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  archived: number;
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

/** Maps orders UI tab to a single DB `status` filter (null = none). `open` and `attention` are handled in the store. */
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

export function adminOrdersIsArchivedTab(tab: string | null | undefined): boolean {
  return tab === "archived";
}
