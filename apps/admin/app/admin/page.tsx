import type { Metadata } from "next";

import { Dashboard } from "@/components/admin/dashboard";
import { fetchOrdersForAdminDashboard } from "@/lib/db/admin-dashboard-data";
import { fetchAdminOrderDashboardMetrics } from "@/lib/db/admin-order-dashboard-sql";
import {
  countPendingReviewSubmissions,
  fetchAdminDashboardCatalogMetrics,
} from "@/lib/db/admin-store";
import {
  buildDashboardSnapshot,
  buildDashboardSnapshotWithOrderMetrics,
} from "@/lib/db/dashboard-rules";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  try {
    const [orderMetrics, catalog, pendingReviewCount] = await Promise.all([
      fetchAdminOrderDashboardMetrics(),
      fetchAdminDashboardCatalogMetrics(),
      countPendingReviewSubmissions(),
    ]);

    if (orderMetrics) {
      const snapshot = buildDashboardSnapshotWithOrderMetrics(orderMetrics, {
        catalog,
        pendingReviewCount,
      });
      return <Dashboard snapshot={snapshot} />;
    }

    const { orders, practiceOrderCount } = await fetchOrdersForAdminDashboard();
    const snapshot = buildDashboardSnapshot({
      orders,
      catalog,
      pendingReviewCount,
      practiceOrderCount,
    });
    return <Dashboard snapshot={snapshot} />;
  } catch {
    return <Dashboard error />;
  }
}
