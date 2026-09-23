import { getLightweightOrders } from "@/lib/order-store";

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
  }[]
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
    b.lastOrderAt.localeCompare(a.lastOrderAt)
  );
}

export async function listAdminCustomers(): Promise<CustomerRow[]> {
  const orders = await getLightweightOrders();
  return buildCustomerRowsFromOrders(orders);
}
