import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { getOrderById } from "@/lib/order-store";

const OrderDetail = nextDynamic(
  () => import("@/components/admin/order-detail").then((m) => m.OrderDetail),
  {
    loading: () => (
      <p className="p-6 text-sm text-muted-foreground">Loading order…</p>
    ),
  },
);

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { orderId: string };
}) {
  const order = await getOrderById(decodeURIComponent(params.orderId));
  if (!order) notFound();
  return <OrderDetail order={order} />;
}
