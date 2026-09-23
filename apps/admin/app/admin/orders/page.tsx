import type { Metadata } from "next";

import { OrderList } from "@/components/admin/order-list";
import { toAdminOrderListItem } from "@/lib/db/order-rules";
import { getLightweightOrders } from "@/lib/order-store";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const orders = await getLightweightOrders();
  return (
    <OrderList
      orders={orders.map(toAdminOrderListItem)}
      statusFilter={searchParams.status}
    />
  );
}
