"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminOrderListItem } from "@/lib/db/order-rules";
import { formatPrice } from "@/lib/utils";
import { RemoveDemoData } from "@/components/admin/remove-demo-data";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const TABS = ["all", "new", "processing", "shipped", "delivered", "cancelled"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    processing: "bg-amber-100 text-amber-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-rose-100 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrderList({
  orders,
  statusFilter,
}: {
  orders: AdminOrderListItem[];
  statusFilter?: string;
}) {
  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState(statusFilter || "new");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    let list = orders;
    if (activeTab !== "all") {
      list = list.filter((o) => o.status === activeTab);
    }
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (o) =>
          o.orderId.toLowerCase().includes(needle) ||
          o.customerName.toLowerCase().includes(needle) ||
          o.customerEmail.toLowerCase().includes(needle)
      );
    }
    return list;
  }, [orders, q, activeTab]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function getCount(tab: string) {
    if (tab === "all") return orders.length;
    return orders.filter((o) => o.status === tab).length;
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all incoming orders. Select an order to view details and confirm dispatch.
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-max">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTabChange(t)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === t
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All Orders" : STATUS_LABEL[t]}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    activeTab === t ? "bg-muted" : "bg-muted/60"
                  }`}
                >
                  {getCount(t)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <Input
            placeholder="Search order #, name, or email..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search orders"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No orders have been placed yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No orders match your search criteria.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Order #</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginated.map((o) => (
                  <tr key={o.orderId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderId)}`}
                        className="tabular-nums hover:text-blue-600 transition-colors"
                      >
                        {o.orderId}
                      </Link>
                      {o.isDemo ? (
                        <span className="ml-2 rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">
                          Demo
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {o.customerName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      {formatPrice(o.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <p>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} orders
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <RemoveDemoData />
    </div>
  );
}
