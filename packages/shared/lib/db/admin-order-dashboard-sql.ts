import { getServiceClient } from "@/lib/supabase/server";

export type AdminOrderDashboardPending = {
  orderId: string;
  customerName: string;
  phone: string;
  status: string;
  total: number;
};

export type AdminOrderDashboardShippedStale = {
  orderId: string;
  customerName: string;
  phone: string;
  daysShipped: number;
};

export type AdminOrderDashboardMetrics = {
  practiceOrderCount: number;
  todayOrderCount: number;
  todayRevenue: number;
  monthOrderCount: number;
  monthRevenue: number;
  monthDeliveredRevenue: number;
  monthCancelledRevenue: number;
  pendingCount: number;
  shippedWaitingCount: number;
  deliveredTodayCount: number;
  cancelledTodayCount: number;
  pendingOrders: AdminOrderDashboardPending[];
  shippedStaleOrders: AdminOrderDashboardShippedStale[];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseMetrics(raw: unknown): AdminOrderDashboardMetrics | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const pendingOrders = Array.isArray(o.pendingOrders)
    ? o.pendingOrders.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          orderId: String(r.orderId ?? ""),
          customerName: String(r.customerName ?? ""),
          phone: String(r.phone ?? ""),
          status: String(r.status ?? "new"),
          total: num(r.total),
        };
      })
    : [];
  const shippedStaleOrders = Array.isArray(o.shippedStaleOrders)
    ? o.shippedStaleOrders.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          orderId: String(r.orderId ?? ""),
          customerName: String(r.customerName ?? ""),
          phone: String(r.phone ?? ""),
          daysShipped: num(r.daysShipped),
        };
      })
    : [];

  return {
    practiceOrderCount: num(o.practiceOrderCount),
    todayOrderCount: num(o.todayOrderCount),
    todayRevenue: num(o.todayRevenue),
    monthOrderCount: num(o.monthOrderCount),
    monthRevenue: num(o.monthRevenue),
    monthDeliveredRevenue: num(o.monthDeliveredRevenue),
    monthCancelledRevenue: num(o.monthCancelledRevenue),
    pendingCount: num(o.pendingCount),
    shippedWaitingCount: num(o.shippedWaitingCount),
    deliveredTodayCount: num(o.deliveredTodayCount),
    cancelledTodayCount: num(o.cancelledTodayCount),
    pendingOrders,
    shippedStaleOrders,
  };
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return (
    error?.code === "PGRST202" ||
    /admin_order_dashboard_metrics|Could not find the function/i.test(msg)
  );
}

/** Single RPC for admin home order KPIs (falls back to null if migration not applied). */
export async function fetchAdminOrderDashboardMetrics(): Promise<AdminOrderDashboardMetrics | null> {
  const { data, error } = await getServiceClient({ admin: true }).rpc(
    "admin_order_dashboard_metrics",
  );
  if (error) {
    if (isMissingRpc(error)) return null;
    throw error;
  }
  return parseMetrics(data);
}
