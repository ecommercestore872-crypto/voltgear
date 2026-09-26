import type { Metadata } from "next";

import { OrderList } from "@/components/admin/order-list";
import { normalizeAdminOrdersPage } from "@/lib/db/admin-orders-rules";
import { listAdminOrdersPage } from "@/lib/db/admin-orders-store";
import { toAdminOrderListItem } from "@/lib/db/order-rules";

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    tab?: string;
    page?: string;
    q?: string;
  };
}) {
  const tab = searchParams.tab ?? searchParams.status ?? "all";
  const page = normalizeAdminOrdersPage(searchParams.page);
  const q = searchParams.q?.trim() ?? "";

  const result = await listAdminOrdersPage({
    page,
    tab,
    q: q.length >= 2 ? q : undefined,
  });

  return (
    <OrderList
      orders={result.orders.map(toAdminOrderListItem)}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      tabCounts={result.tabCounts}
      activeTab={tab}
      initialQuery={q}
    />
  );
}
