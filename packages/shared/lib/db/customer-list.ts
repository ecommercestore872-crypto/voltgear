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

export const ADMIN_CUSTOMERS_PAGE_SIZE = 50;

export type AdminCustomersPageResult = {
  customers: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAdminCustomersPage(opts?: {
  page?: number;
  pageSize?: number;
}): Promise<AdminCustomersPageResult> {
  const pageSize = Math.min(
    100,
    Math.max(1, opts?.pageSize ?? ADMIN_CUSTOMERS_PAGE_SIZE),
  );
  const page = Math.max(1, opts?.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await getServiceClient({ admin: true })
    .from("admin_customer_rollups")
    .select(
      "customer_key, name, email, phone, order_count, last_order_id, last_order_at",
      { count: "exact" },
    )
    .order("last_order_at", { ascending: false })
    .range(from, to);

  if (error) {
    if (isMissingRollupView(error)) {
      const customers = await listAdminCustomersFromRecentOrders();
      return {
        customers: customers.slice(from, to + 1),
        total: customers.length,
        page,
        pageSize,
      };
    }
    throw error;
  }

  return {
    customers: (data ?? []).map((row) =>
      mapCustomerRollupRow(row as Record<string, unknown>),
    ),
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** @deprecated Prefer listAdminCustomersPage for the admin CRM directory. */
export async function listAdminCustomers(limit = 500): Promise<CustomerRow[]> {
  const result = await listAdminCustomersPage({
    page: 1,
    pageSize: Math.min(2000, limit),
  });
  return result.customers;
}
