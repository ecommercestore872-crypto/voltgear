import { getServiceClient } from "@/lib/supabase/server";

import { mapLightweightOrderRow } from "./admin-orders-store";

export type CustomerRow = {
  key: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  lastOrderId: string;
  lastOrderAt: string;
};

export function buildCustomerRowsFromOrders(
  orders: {
    orderId: string;
    createdAt?: string;
    customer?: { name?: string; email?: string; phone?: string };
    isDemo?: boolean;
  }[],
): CustomerRow[] {
  const map = new Map<string, CustomerRow>();

  for (const o of orders) {
    if (o.isDemo) continue;
    const email = (o.customer?.email ?? "").trim().toLowerCase();
    const phone = (o.customer?.phone ?? "").trim();
    const key = email || phone || o.orderId;
    if (!key) continue;
    const existing = map.get(key);
    const created = o.createdAt ?? "";
    if (!existing) {
      map.set(key, {
        key,
        name: o.customer?.name?.trim() || "—",
        email: o.customer?.email?.trim() || "",
        phone,
        orderCount: 1,
        lastOrderId: o.orderId,
        lastOrderAt: created,
      });
      continue;
    }
    existing.orderCount += 1;
    if (created > existing.lastOrderAt) {
      existing.lastOrderAt = created;
      existing.lastOrderId = o.orderId;
      if (o.customer?.name?.trim()) existing.name = o.customer.name.trim();
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.lastOrderAt.localeCompare(a.lastOrderAt),
  );
}

function mapCustomerRollupRow(row: Record<string, unknown>): CustomerRow {
  return {
    key: String(row.customer_key ?? ""),
    name: String(row.name ?? "—"),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    orderCount: Number(row.order_count) || 0,
    lastOrderId: String(row.last_order_id ?? ""),
    lastOrderAt: String(row.last_order_at ?? ""),
  };
}

function isMissingRollupView(error: { code?: string; message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /admin_customer_rollups|could not find the table|schema cache/i.test(msg)
  );
}

/** Fallback when migration not applied yet. */
async function listAdminCustomersFromRecentOrders(
  recentOrderLimit = 4000,
): Promise<CustomerRow[]> {
  const { data, error } = await getServiceClient({ admin: true })
    .from("orders")
    .select(
      "order_id, created_at, status, status_updated_at, total, is_demo, customer",
    )
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(recentOrderLimit);

  if (error) throw error;

  const orders = (data ?? []).map((row) =>
    mapLightweightOrderRow(row as Record<string, unknown>),
  );
  return buildCustomerRowsFromOrders(orders);
}

/** SQL rollup view (preferred) with bounded fallback. */
export async function listAdminCustomers(limit = 500): Promise<CustomerRow[]> {
  const safeLimit = Math.min(2000, Math.max(1, limit));
  const { data, error } = await getServiceClient({ admin: true })
    .from("admin_customer_rollups")
    .select(
      "customer_key, name, email, phone, order_count, last_order_id, last_order_at",
    )
    .order("last_order_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    if (isMissingRollupView(error)) {
      return listAdminCustomersFromRecentOrders();
    }
    throw error;
  }

  return (data ?? []).map((row) =>
    mapCustomerRollupRow(row as Record<string, unknown>),
  );
}
