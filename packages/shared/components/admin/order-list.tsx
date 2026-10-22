"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminOrderListItem } from "@/lib/db/order-rules";
import type { AdminOrderTabCounts } from "@/lib/db/admin-orders-rules";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RemoveDemoData } from "@/components/admin/remove-demo-data";
import {
  acknowledgeOrderListNavigation,
  createOrderListNavigationState,
  editOrderListNavigation,
  ordersListHref,
  recordOrderListNavigation,
} from "@/lib/admin-order-navigation-rules";
import { formatAdminOrderDate as formatDate } from "@/lib/admin-date";

import { StatusBadge } from "@/components/admin/status-badge";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const TABS = ["all", "new", "processing", "shipped", "delivered", "cancelled"];

export function OrderList({
  orders,
  total,
  page,
  pageSize,
  tabCounts,
  activeTab,
  initialQuery = "",
}: {
  orders: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  tabCounts: AdminOrderTabCounts;
  activeTab: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/admin/orders";
  const [q, setQ] = useState(initialQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationRef = useRef(createOrderListNavigationState());
  const routeRef = useRef({ pathname, activeTab, page });
  routeRef.current = { pathname, activeTab, page };

  const cancelPendingSearch = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      cancelPendingSearch();
      navigationRef.current = createOrderListNavigationState();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      cancelPendingSearch();
    };
  }, [cancelPendingSearch]);

  const committedHref = ordersListHref(pathname, {
    tab: activeTab,
    page,
    q: initialQuery,
  });

  useEffect(() => {
    const acknowledgement = acknowledgeOrderListNavigation(
      navigationRef.current,
      committedHref,
    );
    navigationRef.current = acknowledgement.state;
    // An older search response must not erase a newer edit or its debounce.
    if (acknowledgement.preserveDraft) return;
    cancelPendingSearch();
    setQ(initialQuery);
  }, [committedHref, initialQuery, cancelPendingSearch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { tab?: string; page?: number; q?: string }) {
    cancelPendingSearch();
    const tab = next.tab ?? routeRef.current.activeTab;
    const nextPage = next.page ?? routeRef.current.page;
    const query = next.q ?? q;
    const href = ordersListHref(routeRef.current.pathname, {
      tab,
      page: nextPage,
      q: query,
    });
    navigationRef.current = recordOrderListNavigation(
      navigationRef.current,
      href,
    );
    router.push(href);
  }

  function handleTabChange(tab: string) {
    navigate({ tab, page: 1 });
  }

  function handleSearchChange(value: string) {
    navigationRef.current = editOrderListNavigation(navigationRef.current);
    setQ(value);
    cancelPendingSearch();
    debounceRef.current = setTimeout(() => {
      navigate({ q: value, page: 1 });
    }, 350);
  }

  function getCount(tab: string) {
    if (tab === "all") return tabCounts.all;
    return tabCounts[tab as keyof AdminOrderTabCounts] ?? 0;
  }

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-2">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Orders
            <Badge variant="outline" className="font-normal text-muted-foreground hidden sm:inline-flex">
              Fulfillment Hub
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Process pending shipments, verify customer addresses, and track real-time delivery lifecycle. Search uses the server index — no need to load every order in the browser.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto">
          <div
            role="group"
            aria-label="Filter orders by status"
            className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-max"
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={activeTab === t}
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
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Search orders"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {total === 0 && !initialQuery && activeTab === "all" ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No orders have been placed yet.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          No orders match your search criteria.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:hidden pb-safe">
            {orders.map((o) => (
              <div
                key={o.orderId}
                className="relative overflow-hidden rounded-2xl border bg-white/70 backdrop-blur-xl p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/70"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.orderId)}`}
                      onClick={cancelPendingSearch}
                      className="text-lg font-bold tracking-tight text-foreground hover:text-blue-600 transition-colors"
                    >
                      {o.orderId}
                    </Link>
                    {o.isDemo && (
                      <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Demo
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <StatusBadge status={o.status} />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mb-4 text-sm text-muted-foreground">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">{o.customerName || "Unknown Customer"}</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatPrice(o.total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span>{formatDate(o.createdAt)}</span>
                    <span className="truncate max-w-[120px]">{o.customerEmail || "No Email"}</span>
                  </div>
                </div>

                <Link
                  href={`/admin/orders/${encodeURIComponent(o.orderId)}`}
                  onClick={cancelPendingSearch}
                  className="block w-full rounded-xl bg-muted/50 py-3 text-center text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98]"
                >
                  Manage Order
                </Link>
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto rounded-xl border bg-white shadow-sm dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Order #
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Customer
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${encodeURIComponent(o.orderId)}`}
                        onClick={cancelPendingSearch}
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
                    <td className="px-4 py-3 font-medium">{o.customerName || "—"}</td>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <p>
                Showing {showingFrom}–{showingTo} of {total} orders
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1}
                  aria-label="Previous page of orders"
                  onClick={() => navigate({ page: page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages}
                  aria-label="Next page of orders"
                  onClick={() => navigate({ page: page + 1 })}
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
