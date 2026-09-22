import type { Metadata } from "next";

import { Dashboard } from "@/components/admin/dashboard";
import { listAdminProductsForDashboard, listReviewSubmissions } from "@/lib/db/admin-store";
import { buildDashboardSnapshot } from "@/lib/db/dashboard-rules";
import { getLightweightOrders } from "@/lib/order-store";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  try {
    const [orders, products, reviews] = await Promise.all([
      getLightweightOrders(),
      listAdminProductsForDashboard(),
      listReviewSubmissions(),
    ]);
    const snapshot = buildDashboardSnapshot({ orders, products, reviews });
    return <Dashboard snapshot={snapshot} />;
  } catch {
    return <Dashboard error />;
  }
}
