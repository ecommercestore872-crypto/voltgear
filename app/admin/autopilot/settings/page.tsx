import type { Metadata } from "next";

import { AutopilotHonestyBoard } from "@/components/admin/autopilot-honesty-board";
import { parseAutopilotConfig } from "@/lib/autopilot/config";
import { listDispatchQueue } from "@/lib/autopilot/dispatch-run";
import { countPostexTracked } from "@/lib/autopilot/honesty-rules";
import { editorAutopilot, getAdminSettings, listAdminProducts } from "@/lib/db/admin-store";
import { buildDashboardSnapshot } from "@/lib/db/dashboard-rules";
import { getAllOrders } from "@/lib/order-store";
import { postExConfigured } from "@/lib/postex";

export const metadata: Metadata = {
  title: "Autopilot",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AutopilotSettingsPage() {
  try {
    const [orders, products, row] = await Promise.all([
      getAllOrders(),
      listAdminProducts(),
      getAdminSettings(),
    ]);
    const snapshot = buildDashboardSnapshot({ orders, products, reviews: [] });
    const queue = listDispatchQueue(orders);
    return (
      <AutopilotHonestyBoard
        pendingCount={snapshot.pendingCount}
        lowStockCount={snapshot.lowStockCount}
        postexTrackedCount={countPostexTracked(orders)}
        readyCount={queue.ready.length}
        hold={queue.hold.map((h) => ({ orderId: h.order.orderId, reason: h.reason }))}
        config={editorAutopilot(row as Record<string, unknown> | null) ?? parseAutopilotConfig(null)}
        postExReady={postExConfigured()}
      />
    );
  } catch {
    return <AutopilotHonestyBoard pendingCount={0} lowStockCount={0} postexTrackedCount={0} error />;
  }
}
