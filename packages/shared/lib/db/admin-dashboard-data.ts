import { getServiceClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

import { DASHBOARD_TIMEZONE } from "./dashboard-rules";
import { countPracticeOrders, mapLightweightOrderRow } from "./admin-orders-store";

const LIGHT_SELECT =
  "order_id, created_at, status, status_updated_at, total, is_demo, customer";

function adminDb() {
  return getServiceClient({ admin: true });
}

/** Start of current calendar day in Asia/Karachi (ISO string). */
export function karachiDayStartIso(now: Date): string {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${ymd}T00:00:00+05:00`;
}

function mergeOrdersById(chunks: Order[][]): Order[] {
  const map = new Map<string, Order>();
  for (const chunk of chunks) {
    for (const o of chunk) {
      if (o.orderId) map.set(o.orderId, o);
    }
  }
  return [...map.values()];
}

function mapRows(data: unknown[] | null): Order[] {
  return (data ?? []).map((row) =>
    mapLightweightOrderRow(row as Record<string, unknown>),
  );
}

/**
 * Loads the minimal order set needed for the admin home dashboard —
 * not the full orders table.
 */
export async function fetchOrdersForAdminDashboard(
  now = new Date(),
): Promise<{ orders: Order[]; practiceOrderCount: number }> {
  const db = adminDb();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const todayStart = karachiDayStartIso(now);

  const [
    monthLive,
    pendingLive,
    shippedLive,
    todayCreated,
    statusUpdatedToday,
    practiceOrderCount,
  ] = await Promise.all([
    db
      .from("orders")
      .select(LIGHT_SELECT)
      .eq("is_demo", false)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    db
      .from("orders")
      .select(LIGHT_SELECT)
      .eq("is_demo", false)
      .in("status", ["new", "processing"])
      .order("created_at", { ascending: false }),
    db
      .from("orders")
      .select(LIGHT_SELECT)
      .eq("is_demo", false)
      .eq("status", "shipped")
      .order("status_updated_at", { ascending: true }),
    db
      .from("orders")
      .select(LIGHT_SELECT)
      .eq("is_demo", false)
      .gte("created_at", todayStart),
    db
      .from("orders")
      .select(LIGHT_SELECT)
      .eq("is_demo", false)
      .gte("status_updated_at", todayStart)
      .in("status", ["delivered", "cancelled"]),
    countPracticeOrders(),
  ]);

  for (const res of [
    monthLive,
    pendingLive,
    shippedLive,
    todayCreated,
    statusUpdatedToday,
  ]) {
    if (res.error) throw res.error;
  }

  const orders = mergeOrdersById([
    mapRows(monthLive.data),
    mapRows(pendingLive.data),
    mapRows(shippedLive.data),
    mapRows(todayCreated.data),
    mapRows(statusUpdatedToday.data),
  ]);

  return { orders, practiceOrderCount };
}
