import { getServiceClient } from "@/lib/supabase/server";

import { mapLightweightOrderRow } from "./admin-orders-store";

export type OrderPhoneContact = {
  phone: string;
  name: string;
  lastAt: number;
};

const ROLLUP_CONTACT_LIMIT = 20_000;
const FALLBACK_RECENT_ORDERS = 4000;

function isMissingRollupView(error: { code?: string; message?: string } | null): boolean {
  const msg = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /admin_customer_rollups|could not find the table|schema cache/i.test(msg)
  );
}

async function listFromRecentOrdersFallback(): Promise<OrderPhoneContact[]> {
  const { data, error } = await getServiceClient({ admin: true })
    .from("orders")
    .select("order_id, created_at, is_demo, customer")
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(FALLBACK_RECENT_ORDERS);

  if (error) {
    console.error("[messaging] recent orders fallback failed:", error);
    return [];
  }

  const byPhone = new Map<string, OrderPhoneContact>();
  for (const row of data ?? []) {
    const order = mapLightweightOrderRow(row as Record<string, unknown>);
    const phone = (order.customer?.phone ?? "").trim();
    if (!phone) continue;
    const at = new Date(order.createdAt ?? 0).getTime();
    const existing = byPhone.get(phone);
    if (!existing || at > existing.lastAt) {
      byPhone.set(phone, {
        phone,
        name: order.customer?.name?.trim() ?? "",
        lastAt: at,
      });
    }
  }
  return Array.from(byPhone.values());
}

/** Latest contact per phone from order history (SQL rollup, not full order table in Node). */
export async function listOrderPhoneContacts(): Promise<OrderPhoneContact[]> {
  const { data, error } = await getServiceClient({ admin: true })
    .from("admin_customer_rollups")
    .select("phone, name, last_order_at")
    .not("phone", "is", null)
    .neq("phone", "")
    .order("last_order_at", { ascending: false })
    .limit(ROLLUP_CONTACT_LIMIT);

  if (error) {
    if (isMissingRollupView(error)) {
      return listFromRecentOrdersFallback();
    }
    console.error("[messaging] listOrderPhoneContacts failed:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    phone: String(row.phone ?? "").trim(),
    name: String(row.name ?? "").trim(),
    lastAt: Date.parse(String(row.last_order_at ?? "")) || 0,
  }));
}
