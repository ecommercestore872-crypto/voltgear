export const DASHBOARD_TIMEZONE = "Asia/Karachi";
export const SHIPPED_STALE_DAYS = 3;

type SnapshotOrder = {
  orderId: string;
  createdAt: string;
  status?: string | null;
  statusUpdatedAt?: string | null;
  total?: number | null;
  isDemo?: boolean;
  customer?: { name?: string; phone?: string };
};

type SnapshotProduct = {
  _id: string;
  name: string;
  stockStatus?: string;
  status?: string;
  isDemo?: boolean;
};

type SnapshotReview = { status?: string | null };

export type DashboardPendingOrder = {
  orderId: string;
  customerName: string;
  phone: string;
  status: string;
  total: number;
};

export type DashboardShippedStaleOrder = {
  orderId: string;
  customerName: string;
  phone: string;
  daysShipped: number;
};

export type DashboardStockProduct = {
  id: string;
  name: string;
  stockStatus: string;
};

export type DashboardSnapshot = {
  todayOrderCount: number;
  todayRevenue: number;
  pendingCount: number;
  deliveredTodayCount: number;
  cancelledTodayCount: number;
  lowStockCount: number;
  pendingOrders: DashboardPendingOrder[];
  shippedWaitingCount: number;
  shippedStaleOrders: DashboardShippedStaleOrder[];
  lowStockProducts: DashboardStockProduct[];
  pendingReviewCount: number;
  draftProductCount: number;
  firstDraftProductId: string | null;
  practiceOrderCount: number;
  monthRevenue: number;
  monthDeliveredRevenue: number;
  monthCancelledRevenue: number;
  monthOrderCount: number;
};

function karachiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function isOnKarachiDay(iso: string | undefined | null, now: Date): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return karachiYmd(new Date(t)) === karachiYmd(now);
}

/** Whole Karachi calendar days from `iso` date to `now` (0 = same day). */
export function karachiCalendarDaysSince(
  iso: string | undefined | null,
  now: Date
): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const from = karachiYmd(new Date(t));
  const to = karachiYmd(now);
  const fromMs = Date.parse(`${from}T12:00:00+05:00`);
  const toMs = Date.parse(`${to}T12:00:00+05:00`);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  return Math.floor((toMs - fromMs) / 86_400_000);
}

export function isShippedStale(
  order: {
    status?: string | null;
    statusUpdatedAt?: string | null;
    createdAt?: string;
  },
  now = new Date(),
  staleDays = SHIPPED_STALE_DAYS
): boolean {
  if ((order.status ?? "") !== "shipped") return false;
  const since = order.statusUpdatedAt || order.createdAt;
  const days = karachiCalendarDaysSince(since, now);
  if (days == null) return false;
  return days >= staleDays;
}

export function orderMatchesStatusFilter(
  status: string,
  filter: string | null | undefined
): boolean {
  if (!filter) return true;
  if (filter === "pending") return status === "new" || status === "processing";
  if (filter === "shipped" || filter === "delivered" || filter === "cancelled") {
    return status === filter;
  }
  return true;
}

export function productMatchesStockAttention(stockStatus: string): boolean {
  return stockStatus === "low-stock" || stockStatus === "out-of-stock";
}

export function buildDashboardSnapshot(
  input: {
    orders: SnapshotOrder[];
    products: SnapshotProduct[];
    reviews: SnapshotReview[];
  },
  now = new Date()
): DashboardSnapshot {
  const live = input.orders.filter((o) => !o.isDemo);
  const practiceOrderCount = input.orders.filter((o) => o.isDemo).length;
  const todayLive = live.filter((o) => isOnKarachiDay(o.createdAt, now));
  const todayRevenue = todayLive
    .filter((o) => (o.status ?? "new") !== "cancelled")
    .reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : 0), 0);

  // Month to date computation (last 30 days roughly, or current calendar month)
  // We'll use the last 30 days for a rolling 'Month' view.
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const monthLive = live.filter((o) => {
    const t = Date.parse(o.createdAt);
    return !Number.isNaN(t) && t >= thirtyDaysAgoMs;
  });
  
  const monthRevenue = monthLive
    .filter((o) => (o.status ?? "new") !== "cancelled")
    .reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : 0), 0);
    
  const monthDeliveredRevenue = monthLive
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : 0), 0);

  const monthCancelledRevenue = monthLive
    .filter((o) => o.status === "cancelled")
    .reduce((sum, o) => sum + (typeof o.total === "number" ? o.total : 0), 0);

  const pending = live
    .filter((o) => {
      const s = o.status ?? "new";
      return s === "new" || s === "processing";
    })
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const livePublished = input.products.filter((p) => !p.isDemo && p.status === "published");
  const attention = livePublished.filter((p) =>
    productMatchesStockAttention(p.stockStatus ?? "in-stock")
  );
  const drafts = input.products.filter((p) => p.status !== "published");

  const shippedStale = live
    .filter((o) => isShippedStale(o, now))
    .sort((a, b) => {
      const aSince = a.statusUpdatedAt || a.createdAt;
      const bSince = b.statusUpdatedAt || b.createdAt;
      return Date.parse(aSince) - Date.parse(bSince);
    });

  return {
    todayOrderCount: todayLive.length,
    todayRevenue,
    pendingCount: pending.length,
    deliveredTodayCount: live.filter(
      (o) => (o.status ?? "new") === "delivered" && isOnKarachiDay(o.statusUpdatedAt, now)
    ).length,
    cancelledTodayCount: live.filter(
      (o) => o.status === "cancelled" && isOnKarachiDay(o.statusUpdatedAt, now)
    ).length,
    lowStockCount: attention.length,
    pendingOrders: pending.slice(0, 8).map((o) => ({
      orderId: o.orderId,
      customerName: o.customer?.name ?? "",
      phone: o.customer?.phone ?? "",
      status: o.status ?? "new",
      total: typeof o.total === "number" ? o.total : 0,
    })),
    shippedWaitingCount: live.filter((o) => o.status === "shipped").length,
    shippedStaleOrders: shippedStale.slice(0, 8).map((o) => {
      const since = o.statusUpdatedAt || o.createdAt;
      return {
        orderId: o.orderId,
        customerName: o.customer?.name ?? "",
        phone: o.customer?.phone ?? "",
        daysShipped: karachiCalendarDaysSince(since, now) ?? 0,
      };
    }),
    lowStockProducts: attention.slice(0, 8).map((p) => ({
      id: p._id,
      name: p.name,
      stockStatus: p.stockStatus ?? "in-stock",
    })),
    pendingReviewCount: input.reviews.filter((r) => r.status === "pending").length,
    draftProductCount: drafts.length,
    firstDraftProductId: drafts[0]?._id ?? null,
    practiceOrderCount,
    monthRevenue,
    monthDeliveredRevenue,
    monthCancelledRevenue,
    monthOrderCount: monthLive.length,
  };
}
