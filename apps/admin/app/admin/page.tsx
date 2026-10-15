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

async function loadDashboardSnapshot() {
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
      return snapshot;
    }

    const { orders, practiceOrderCount } = await fetchOrdersForAdminDashboard();
    const snapshot = buildDashboardSnapshot({
      orders,
      catalog,
      pendingReviewCount,
      practiceOrderCount,
    });
    return snapshot;
  } catch {
    return null;
  }
}

export default async function AdminIndexPage() {
  const snapshot = await loadDashboardSnapshot();
  return snapshot ? <Dashboard snapshot={snapshot} /> : <Dashboard error />;
}
