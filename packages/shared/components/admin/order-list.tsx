"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { AdminOrderListItem } from "@/lib/db/order-rules";
import type { AdminOrderTabCounts } from "@/lib/db/admin-orders-rules";
import { formatPrice } from "@/lib/utils";
import { RemoveDemoData } from "@/components/admin/remove-demo-data";
import { readAdminUiState, writeAdminUiState } from "@/lib/admin-ui-persist";

import { adminFetch } from "@/components/admin/admin-fetch";
import { StatusBadge } from "@/components/admin/status-badge";
import { DeleteOrderButton } from "@/components/admin/delete-order-button";

const ORDERS_SEARCH_KEY = "admin.orders.search";
const ORDERS_TAB_KEY = "admin.orders.tab";

const TAB_LABEL: Record<string, string> = {
  new: "To confirm",
  processing: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  all: "All active",
  archived: "Archived",
};

const TABS = ["new", "processing", "shipped", "delivered", "cancelled", "all", "archived"];

// Left edge colour so the status reads at a glance while scrolling.
const EDGE: Record<string, string> = {
  new: "border-l-amber-500 bg-amber-50/60",
  processing: "border-l-blue-500",
  shipped: "border-l-indigo-500",
  delivered: "border-l-emerald-500",
  cancelled: "border-l-zinc-300 opacity-70",
};

// "All active" view is split into these sections, in this order.
const GROUPS = [
  { title: "Needs confirmation", statuses: ["new"] },
  { title: "Confirmed, in progress", statuses: ["processing", "shipped"] },
  { title: "Completed", statuses: ["delivered", "cancelled"] },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function waiting(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h`;
  return `${Math.floor(mins / 1440)} d`;
}

function ordersListHref(
  basePath: string,
  opts: { tab: string; page: number; q: string },
): string {
  const params = new URLSearchParams();
  if (opts.tab && opts.tab !== "all") params.set("tab", opts.tab);
  if (opts.page > 1) params.set("page", String(opts.page));
  const q = opts.q.trim();
  if (q.length >= 2) params.set("q", q);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function OrderRow({ o, onChanged }: { o: AdminOrderListItem; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsConfirm = o.status === "new" && !o.archivedAt;
  const href = `/admin/orders/${encodeURIComponent(o.orderId)}`;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/orders/${encodeURIComponent(o.orderId)}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "processing" }),
      });
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not confirm the order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`rounded-xl border border-l-4 bg-white p-4 shadow-sm ${EDGE[o.status] ?? ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={href} className="text-base font-bold tabular-nums hover:underline">
            {o.orderId}
          </Link>
          {o.isDemo ? (
            <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Demo</span>
          ) : null}
          <p className="mt-0.5 truncate text-sm font-medium">{o.customerName || "Unknown customer"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDate(o.createdAt)}
            {o.customerEmail ? ` · ${o.customerEmail}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums">{formatPrice(o.total)}</p>
          <div className="mt-1"><StatusBadge status={o.status} /></div>
          {needsConfirm ? (
            <p className="mt-1 text-[11px] font-semibold text-amber-700">Waiting {waiting(o.createdAt)}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {needsConfirm ? (
          <Button type="button" className="min-h-11 flex-1 sm:flex-none" disabled={busy} onClick={() => void confirm()}>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            {busy ? "Confirming…" : "Confirm order"}
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-11 flex-1 sm:flex-none">
          <Link href={href}>Open</Link>
        </Button>
        <DeleteOrderButton orderId={o.orderId} compact onDeleted={onChanged} />
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
    </li>
  );
}

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

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialQuery) return;
    const savedQ = readAdminUiState(ORDERS_SEARCH_KEY);
    if (savedQ) setQ(savedQ);
  }, [initialQuery]);

  useEffect(() => {
    writeAdminUiState(ORDERS_SEARCH_KEY, q);
  }, [q]);

  useEffect(() => {
    writeAdminUiState(ORDERS_TAB_KEY, activeTab);
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(next: { tab?: string; page?: number; q?: string }) {
    router.push(
      ordersListHref(pathname, {
        tab: next.tab ?? activeTab,
        page: next.page ?? page,
        q: next.q ?? q,
      }),
    );
  }

  function handleSearchChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
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
  const refresh = () => router.refresh();
  const toConfirm = tabCounts.new;

  const sections =
    activeTab === "all"
      ? GROUPS.map((g) => ({ title: g.title, rows: orders.filter((o) => g.statuses.includes(o.status)) })).filter(
          (g) => g.rows.length > 0,
        )
      : [{ title: "", rows: orders }];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {toConfirm > 0 ? (
            <button type="button" className="font-semibold text-amber-700 underline" onClick={() => navigate({ tab: "new", page: 1 })}>
              {toConfirm} {toConfirm === 1 ? "order needs" : "orders need"} confirmation
            </button>
          ) : (
            "Nothing is waiting for confirmation."
          )}
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-lg border bg-muted/40 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => navigate({ tab: t, page: 1 })}
              className={`flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors ${
                activeTab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {TAB_LABEL[t]}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  t === "new" && getCount(t) > 0 ? "bg-amber-500 text-white" : "bg-muted"
                }`}
              >
                {getCount(t)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Input
        placeholder="Search order #, name, phone or email"
        value={q}
        onChange={(e) => handleSearchChange(e.target.value)}
        aria-label="Search orders"
        className="h-11 text-base sm:max-w-sm sm:text-sm"
      />

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          {initialQuery ? "No orders match your search." : "No orders here."}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.title || "list"} className="space-y-3">
              {s.title ? (
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.title} ({s.rows.length})
                </h2>
              ) : null}
              <ul className="space-y-3">
                {s.rows.map((o) => (
                  <OrderRow key={o.orderId} o={o} onChanged={refresh} />
                ))}
              </ul>
            </section>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
              <p>
                Showing {showingFrom}–{showingTo} of {total} orders
              </p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label="Previous page" disabled={page <= 1} onClick={() => navigate({ page: page - 1 })}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-10 w-10 p-0" aria-label="Next page" disabled={page >= totalPages} onClick={() => navigate({ page: page + 1 })}>
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
