import { getServiceClient } from "@/lib/supabase/server";
import type { Order, OrderCustomer } from "@/lib/types";

import {
  ADMIN_ORDERS_PAGE_SIZE,
  adminOrderSearchPattern,
  adminOrdersRange,
  adminOrdersIsArchivedTab,
  adminOrdersStatusForTab,
  type AdminOrderTabCounts,
} from "./admin-orders-rules";

const LIGHT_SELECT =
  "order_id, created_at, status, status_updated_at, total, is_demo, archived_at, customer";

function adminDb() {
  return getServiceClient({ admin: true });
}

function parseCustomer(raw: unknown): OrderCustomer {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OrderCustomer;
    } catch {
      return {};
    }
  }
  return (raw ?? {}) as OrderCustomer;
}

export function mapLightweightOrderRow(row: Record<string, unknown>): Order {
  return {
    orderId: String(row.order_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    status: (row.status as Order["status"]) ?? "new",
    statusUpdatedAt: row.status_updated_at
      ? String(row.status_updated_at)
      : undefined,
    total: typeof row.total === "number" ? row.total : Number(row.total) || 0,
    isDemo: Boolean(row.is_demo),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    customer: parseCustomer(row.customer),
  } as Order;
}

export type AdminOrdersPageResult = {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  tabCounts: AdminOrderTabCounts;
};

async function countOrdersWithStatus(status?: string, archived = false): Promise<number> {
  let query = adminDb()
    .from("orders")
    .select("*", { count: "exact", head: true });
  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (status) query = query.eq("status", status);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function countDemoOrders(): Promise<number> {
  const { count, error } = await adminDb()
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("is_demo", true);
  if (error) throw error;
  return count ?? 0;
}

export async function countAdminOrderTabCounts(): Promise<AdminOrderTabCounts> {
  const statuses = [
    "new",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;

  const [all, ...byStatusAndArchived] = await Promise.all([
    countOrdersWithStatus(),
    ...statuses.map((status) => countOrdersWithStatus(status)),
    countOrdersWithStatus(undefined, true),
  ]);

  return {
    all,
    new: byStatusAndArchived[0] ?? 0,
    processing: byStatusAndArchived[1] ?? 0,
    shipped: byStatusAndArchived[2] ?? 0,
    delivered: byStatusAndArchived[3] ?? 0,
    cancelled: byStatusAndArchived[4] ?? 0,
    archived: byStatusAndArchived[5] ?? 0,
  };
}

export async function listAdminOrdersPage(opts: {
  page?: number;
  pageSize?: number;
  tab?: string | null;
  q?: string | null;
}): Promise<AdminOrdersPageResult> {
  const pageSize = Math.min(
    100,
    Math.max(1, opts.pageSize ?? ADMIN_ORDERS_PAGE_SIZE),
  );
  const page = Math.max(1, opts.page ?? 1);
  const status = adminOrdersStatusForTab(opts.tab);
  const archived = adminOrdersIsArchivedTab(opts.tab);
  const pattern = adminOrderSearchPattern(opts.q ?? "");

  let query = adminDb()
    .from("orders")
    .select(LIGHT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (status) query = query.eq("status", status);
  if (pattern) {
    query = query.or(
      `order_id.ilike.${pattern},customer->>email.ilike.${pattern},customer->>name.ilike.${pattern},customer->>phone.ilike.${pattern}`,
    );
  }

  const { from, to } = adminOrdersRange(page, pageSize);
  const [listRes, tabCounts] = await Promise.all([
    query.range(from, to),
    countAdminOrderTabCounts(),
  ]);

  if (listRes.error) throw listRes.error;

  return {
    orders: (listRes.data ?? []).map((row) =>
      mapLightweightOrderRow(row as Record<string, unknown>),
    ),
    total: listRes.count ?? 0,
    page,
    pageSize,
    tabCounts,
  };
}

/** Command palette + API: bounded order id / customer match. */
export async function searchAdminOrdersByTerm(
  term: string,
  limit = 20,
): Promise<Order[]> {
  const pattern = adminOrderSearchPattern(term);
  if (!pattern) return [];

  const { data, error } = await adminDb()
    .from("orders")
    .select(LIGHT_SELECT)
    .eq("is_demo", false)
    .or(
      `order_id.ilike.${pattern},customer->>email.ilike.${pattern},customer->>name.ilike.${pattern},customer->>phone.ilike.${pattern}`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) =>
    mapLightweightOrderRow(row as Record<string, unknown>),
  );
}

export async function countPracticeOrders(): Promise<number> {
  return countDemoOrders();
}

export type ArchiveOrderResult =
  | { ok: true; archived: boolean; replayed: boolean }
  | { ok: false; error: string; status: 404 | 503 };

export async function setAdminOrderArchived(orderId: string, archived: boolean): Promise<ArchiveOrderResult> {
  const { data, error } = await adminDb().rpc("admin_set_order_archived", {
    p_order_id: orderId.trim(),
    p_archived: archived,
  });
  if (!error && data?.ok === true) {
    return { ok: true, archived: data.archived === true, replayed: data.replayed === true };
  }
  if (error?.message?.includes("BUSINESS_ERROR: Order not found")) {
    return { ok: false, error: "Order not found.", status: 404 };
  }
  console.error("[orders] admin_set_order_archived failed:", error);
  return { ok: false, error: "Could not change the archive state.", status: 503 };
}
