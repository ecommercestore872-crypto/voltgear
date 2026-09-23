import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderDetail } from "@/components/admin/order-detail";
import { getOrderById } from "@/lib/order-store";

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
