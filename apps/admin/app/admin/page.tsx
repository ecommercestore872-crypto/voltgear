import type { Metadata } from "next";

import { Dashboard } from "@/components/admin/dashboard";
import { fetchOrdersForAdminDashboard } from "@/lib/db/admin-dashboard-data";
import { listAdminProductsForDashboard, listReviewSubmissions } from "@/lib/db/admin-store";
import { buildDashboardSnapshot } from "@/lib/db/dashboard-rules";

export const metadata: Metadata = {
  title: "Home",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  try {
    const [{ orders, practiceOrderCount }, products, reviews] = await Promise.all([
      fetchOrdersForAdminDashboard(),
      listAdminProductsForDashboard(),
      listReviewSubmissions(),
    ]);
    const snapshot = buildDashboardSnapshot({
      orders,
      products,
      reviews,
      practiceOrderCount,
    });
    return <Dashboard snapshot={snapshot} />;
  } catch {
    return <Dashboard error />;
  }
}
