"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { AnalyticsFunnelPanel } from "@/components/admin/analytics-funnel";
import { AnalyticsProfitBoard } from "@/components/admin/analytics-profit-board";
import { AnalyticsCoachPanel } from "@/components/admin/analytics-coach-panel";
import { adminFetch, AdminAuthError } from "@/components/admin/admin-fetch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ANALYTICS_DIMENSIONS,
  ANALYTICS_METRICS,
  type AnalyticsDimension,
  type AnalyticsMetric,
  type AnalyticsPreset,
  type CityPerfRow,
  type CustomerAnalytics,
  type DrillOrder,
  type ExecutiveSnapshot,
  type FunnelStep,
  type ProductPerfRow,
  type QueryRow,
} from "@/lib/db/analytics-rules";
import type { CoachBundle } from "@/lib/db/analytics-coach-rules";
import type { InsightCard } from "@/lib/db/analytics-insight-rules";
import type {
  CheckoutFieldRow,
  FulfillmentHours,
  MissingCostRow,
  MoneyStory,
  PeriodComparison,
  ProductConversionRow,
  ProfitAlert,
  RtoProxy,
  SourceMoneyRow,
} from "@/lib/db/analytics-profit-rules";
import { rowsToCsv } from "@/lib/db/analytics-profit-rules";
import type {
  DeliveredBySourceRow,
  LandingPageRow,
  SessionsBySourceRow,
  ShopFunnelStep,
} from "@/lib/db/analytics-traffic-rules";
import { cn, formatPrice } from "@/lib/utils";

type Bundle = {
  range: { start: string; end: string };
  executive: ExecutiveSnapshot;
  products: ProductPerfRow[];
  cities: CityPerfRow[];
  customers: CustomerAnalytics;
  funnel: FunnelStep[];
  traffic: {
    available: boolean;
    visitors: number | null;
    sessions: number | null;
    convertedSessions: number | null;
    bySource: SessionsBySourceRow[] | null;
    landingPages: LandingPageRow[] | null;
    deliveredBySource: DeliveredBySourceRow[];
  };
  shopFunnel: ShopFunnelStep[] | null;
  insights: InsightCard[];
  retentionNotice: boolean;
  moneyStory: MoneyStory;
  comparison: PeriodComparison;
  fulfillmentHours: FulfillmentHours;
  productConversion: ProductConversionRow[];
  sourceMoney: SourceMoneyRow[];
  rto: RtoProxy;
  missingCosts: MissingCostRow[];
  checkoutFields: CheckoutFieldRow[];
  alerts: ProfitAlert[];
  coach: CoachBundle;
};

type SavedReport = {
  id: string;
  name: string;
  query: Record<string, unknown>;
};

const PRESETS: { id: AnalyticsPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "custom", label: "Custom" },
];

const METRIC_LABEL: Record<AnalyticsMetric, string> = {
  deliveredRevenue: "Delivered revenue",
  deliveredProfit: "Delivered profit",
  ordersPlaced: "Orders placed",
  ordersDelivered: "Delivered orders",
  deliveryRate: "Delivery rate",
  cancellationRate: "Cancellation rate",
  averageOrderValue: "Average delivered order",
};

const DIM_LABEL: Record<AnalyticsDimension, string> = {
  product: "Product",
  category: "Category",
  city: "City",
  date: "Date",
  customerCohort: "Customer cohort",
  source: "Source",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function formatRate(n: number | null | undefined): string {
  if (n == null) return "Not available";
  return `${Math.round(n * 1000) / 10}%`;
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return "Not available";
  return String(n);
}

function displaySource(source: string): string {
  if (source === "unattributed") return "Unattributed";
  if (source === "meta") return "Facebook / Meta";
  if (source === "tiktok") return "TikTok";
  if (source === "google") return "Google";
  if (source === "direct") return "Direct";
  return source;
}

function formatDeltaHint(pct: number | null | undefined): string | undefined {
  if (pct == null) return undefined;
  const n = Math.round(pct * 1000) / 10;
  if (n === 0) return "Same as last period";
  return n > 0 ? `Up ${n}% vs last period` : `Down ${Math.abs(n)}% vs last period`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function CsvButton({ filename, csv }: { filename: string; csv: string }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => downloadCsv(filename, csv)}>
      Download CSV
    </Button>
  );
}

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "Not available";
  return formatPrice(n);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function MetricButton({
  label,
  value,
  hint,
  primary,
  onClick,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  primary?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <p className="admin-analytics-tile-label">{label}</p>
      <p className="admin-analytics-tile-value">{value}</p>
      {hint ? <p className="admin-analytics-tile-hint">{hint}</p> : null}
    </>
  );
  const tileClass = cn("admin-analytics-tile", primary && "admin-analytics-tile-primary", className);
  if (!onClick) return <div className={tileClass}>{inner}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(tileClass, "w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    >
      {inner}
    </button>
  );
}

function TableFrame({ children }: { children: ReactNode }) {
  return <div className="admin-analytics-table">{children}</div>;
}

function RetentionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p
      role="status"
      className="rounded-2xl border border-[var(--g-line)] bg-[color-mix(in_srgb,var(--g-sage)_12%,var(--g-white))] px-4 py-3 text-sm text-[var(--g-charcoal)]"
    >
      First-party traffic data is available for the last 90 days only. Order and delivered-revenue analytics remain available for this range.
    </p>
  );
}

export function AnalyticsConsole() {
  const [preset, setPreset] = useState<AnalyticsPreset>("last30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drillTitle, setDrillTitle] = useState<string | null>(null);
  const [drillOrders, setDrillOrders] = useState<DrillOrder[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [metric, setMetric] = useState<AnalyticsMetric>("deliveredRevenue");
  const [dimension, setDimension] = useState<"" | AnalyticsDimension>("");
  const [queryRows, setQueryRows] = useState<QueryRow[] | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [spendDraft, setSpendDraft] = useState<Record<string, string>>({});
  const [spendSaving, setSpendSaving] = useState(false);
  const [spendError, setSpendError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ preset });
      if (preset === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }
      const json = await adminFetch(`/api/admin/analytics?${params.toString()}`);
      setBundle(json);
      const nextSpend: Record<string, string> = { tiktok: "", meta: "", google: "", other: "" };
      for (const row of json.sourceMoney ?? []) {
        if (row.spend > 0) nextSpend[row.source] = String(row.spend);
      }
      setSpendDraft(nextSpend);
      setDrillTitle(null);
      setDrillOrders([]);
    } catch (err) {
      if (err instanceof AdminAuthError) {
        setError("Sign in again to view analytics.");
      } else {
        setError(err instanceof Error ? err.message : "Could not load analytics.");
      }
    } finally {
      setLoading(false);
    }
  }, [preset, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void adminFetch("/api/admin/analytics/reports")
      .then((json) => setReports(json.reports ?? []))
      .catch(() => setReports([]));
  }, []);

  async function openDrill(title: string, ids: string[]) {
    setDrillTitle(title);
    setDrillLoading(true);
    try {
      const json = await adminFetch(`/api/admin/analytics/orders?ids=${encodeURIComponent(ids.join(","))}`);
      setDrillOrders(json.orders ?? []);
    } catch {
      setDrillOrders([]);
    } finally {
      setDrillLoading(false);
    }
  }

  async function runQuery(q?: Record<string, unknown>) {
    setQueryError(null);
    const body = q ?? {
      metric,
      dimension: dimension || undefined,
      preset,
      from: preset === "custom" ? from : undefined,
      to: preset === "custom" ? to : undefined,
      sort: "desc",
      limit: 25,
    };
    try {
      const json = await adminFetch("/api/admin/analytics/query", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setQueryRows(json.rows ?? []);
    } catch (err) {
      setQueryRows(null);
      setQueryError(err instanceof Error ? err.message : "Query failed.");
    }
  }

  async function saveReport() {
    setQueryError(null);
    try {
      await adminFetch("/api/admin/analytics/reports", {
        method: "POST",
        body: JSON.stringify({
          name: saveName,
          query: {
            metric,
            dimension: dimension || undefined,
            preset,
            from: preset === "custom" ? from : undefined,
            to: preset === "custom" ? to : undefined,
            sort: "desc",
            limit: 25,
          },
        }),
      });
      setSaveName("");
      const json = await adminFetch("/api/admin/analytics/reports");
      setReports(json.reports ?? []);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Could not save report.");
    }
  }

  async function removeReport(id: string) {
    await adminFetch(`/api/admin/analytics/reports/${id}`, { method: "DELETE" });
    setReports((list) => list.filter((r) => r.id !== id));
  }

  async function saveSpend() {
    setSpendSaving(true);
    setSpendError(null);
    const bySource: Record<string, number> = {};
    for (const [source, value] of Object.entries(spendDraft)) {
      const amount = Number(value);
      bySource[source] = Number.isFinite(amount) ? amount : 0;
    }
    try {
      await adminFetch("/api/admin/analytics/spend", {
        method: "POST",
        body: JSON.stringify({
          preset,
          from: preset === "custom" ? from : undefined,
          to: preset === "custom" ? to : undefined,
          bySource,
        }),
      });
      await load();
    } catch (err) {
      setSpendError(err instanceof Error ? err.message : "Could not save ad spend.");
    } finally {
      setSpendSaving(false);
    }
  }

  const exec = bundle?.executive;

  return (
    <div className="admin-analytics">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--g-sage)]">
            Commerce intelligence
          </p>
          <h1 className="mt-1 text-3xl text-[var(--g-charcoal)]">Analytics</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--g-taupe)]">
            Delivered orders are realized money. Placed revenue is not cash in hand. Practice orders are excluded.
          </p>
        </div>
        {bundle ? (
          <p className="text-sm text-[var(--g-taupe)]">
            {bundle.range.start} to {bundle.range.end} · Asia/Karachi
          </p>
        ) : null}
      </div>

      <div className="admin-analytics-toolbar">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={cn("admin-analytics-chip", preset === p.id && "admin-analytics-chip-active")}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" onClick={() => void load()}>
            Apply
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading && !bundle ? <p className="text-sm text-[var(--g-taupe)]">Loading…</p> : null}

      {exec ? (
        <Tabs defaultValue="overview">
          <TabsList className="admin-analytics-tabs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="coach">Coach</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="funnel">Funnel</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <AnalyticsProfitBoard
              story={bundle.moneyStory}
              comparison={bundle.comparison}
              alerts={bundle.alerts}
              rto={bundle.rto}
              missingCosts={bundle.missingCosts}
              fulfillment={bundle.fulfillmentHours}
              checkoutFields={bundle.checkoutFields}
              onDrill={(title, ids) => void openDrill(title, ids)}
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricButton
                primary
                className="md:col-span-2 xl:col-span-1"
                label="Delivered revenue"
                value={formatMoney(exec.deliveredRevenue)}
                hint={
                  formatDeltaHint(bundle.comparison.deliveredRevenue.pct) ??
                  "Primary KPI · money from orders first marked delivered in this range"
                }
                onClick={() => void openDrill("Delivered orders", exec.deliveredOrderIds)}
              />
              <MetricButton
                label="Placed revenue"
                value={formatMoney(exec.placedRevenue)}
                hint="Not realized · includes orders that may still cancel"
                onClick={() => void openDrill("Placed orders", exec.placedOrderIds)}
              />
              <MetricButton
                label="Delivered gross profit"
                value={formatMoney(exec.deliveredGrossProfit)}
                hint={
                  exec.profitIncomplete
                    ? "Not available until every delivered product has a cost"
                    : "Delivered revenue minus product cost"
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <MetricButton
                label="Orders placed"
                value={String(exec.ordersPlaced)}
                onClick={() => void openDrill("Placed orders", exec.placedOrderIds)}
              />
              <MetricButton label="Processing" value={String(exec.ordersProcessing)} />
              <MetricButton label="Shipped" value={String(exec.ordersShipped)} />
              <MetricButton
                label="Delivered"
                value={String(exec.ordersDelivered)}
                onClick={() => void openDrill("Delivered orders", exec.deliveredOrderIds)}
              />
              <MetricButton
                label="Cancelled"
                value={String(exec.ordersCancelled)}
                onClick={() => void openDrill("Cancelled orders", exec.cancelledOrderIds)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MetricButton
                label="Delivery success rate"
                value={formatRate(exec.deliverySuccessRate)}
                hint="Of orders placed in this range, currently delivered"
              />
              <MetricButton
                label="Cancellation rate"
                value={formatRate(exec.cancellationRate)}
                hint={
                  formatDeltaHint(bundle.comparison.cancellationRate.pct) ??
                  "Of orders placed in this range, currently cancelled"
                }
              />
              <Card className="admin-analytics-tile">
                <p className="admin-analytics-tile-label">Not available</p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--g-taupe)]">
                  <li>Confirmed orders</li>
                  <li>Out for delivery</li>
                  <li>Courier-confirmed returns</li>
                  <li>Contribution profit</li>
                </ul>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="coach">
            <AnalyticsCoachPanel
              key={`${bundle.range.start}-${bundle.range.end}-${bundle.coach.packingFee}-${bundle.coach.codFee}-${bundle.coach.products
                .map((p) => `${p.slug}:${p.costPrice}`)
                .join("|")}`}
              coach={bundle.coach}
              sourceMoney={bundle.sourceMoney}
              onSaved={() => void load()}
            />
          </TabsContent>

          <TabsContent value="products" className="space-y-3">
            {bundle.products.length === 0 && bundle.productConversion.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product order lines in this range.</p>
            ) : (
              <>
                <CsvButton
                  filename={`products-${bundle.range.start}-${bundle.range.end}.csv`}
                  csv={rowsToCsv(
                    bundle.products.map((p) => {
                      const conv = bundle.productConversion.find((c) => c.slug === p.slug);
                      return {
                        product: p.name,
                        qtyOrdered: p.quantityOrdered,
                        qtyDelivered: p.quantityDelivered,
                        placedRevenue: p.placedRevenue,
                        deliveredRevenue: p.deliveredRevenue,
                        deliveredProfit: p.deliveredGrossProfit,
                        views: conv?.views ?? 0,
                        addToCart: conv?.addToCart ?? 0,
                        viewToCart: conv?.viewToCart,
                        cartToOrder: conv?.cartToOrder,
                        cancelRate: p.cancellationRate,
                      };
                    }),
                    [
                      { key: "product", header: "Product" },
                      { key: "qtyOrdered", header: "Qty ordered" },
                      { key: "qtyDelivered", header: "Qty delivered" },
                      { key: "placedRevenue", header: "Placed revenue" },
                      { key: "deliveredRevenue", header: "Delivered revenue" },
                      { key: "deliveredProfit", header: "Delivered profit" },
                      { key: "views", header: "Views" },
                      { key: "addToCart", header: "Add to cart" },
                      { key: "viewToCart", header: "View to cart" },
                      { key: "cartToOrder", header: "Cart to order" },
                      { key: "cancelRate", header: "Cancel rate" },
                    ]
                  )}
                />
                <TableFrame>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Views</th>
                        <th>Add to cart</th>
                        <th>View → cart</th>
                        <th>Cart → order</th>
                        <th>Qty ordered</th>
                        <th>Qty delivered</th>
                        <th>Placed revenue</th>
                        <th>Delivered revenue</th>
                        <th>Cost of goods</th>
                        <th>Delivered profit</th>
                        <th>Delivery rate</th>
                        <th>Cancel rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.products.map((p) => {
                        const conv = bundle.productConversion.find((c) => c.slug === p.slug);
                        return (
                          <tr key={p.slug} className="border-b last:border-0">
                            <td>
                              <button
                                type="button"
                                className="text-left font-medium hover:underline"
                                onClick={() => void openDrill(p.name, p.orderIds)}
                              >
                                {p.name}
                              </button>
                            </td>
                            <td className="tabular-nums">{conv?.views ?? "—"}</td>
                            <td className="tabular-nums">{conv?.addToCart ?? "—"}</td>
                            <td className="tabular-nums">{formatRate(conv?.viewToCart)}</td>
                            <td className="tabular-nums">{formatRate(conv?.cartToOrder)}</td>
                            <td className="tabular-nums">{p.quantityOrdered}</td>
                            <td className="tabular-nums">{p.quantityDelivered}</td>
                            <td className="tabular-nums">{formatMoney(p.placedRevenue)}</td>
                            <td className="tabular-nums">{formatMoney(p.deliveredRevenue)}</td>
                            <td className="tabular-nums">{formatMoney(p.costOfGoods)}</td>
                            <td className="tabular-nums">{formatMoney(p.deliveredGrossProfit)}</td>
                            <td className="tabular-nums">{formatRate(p.deliverySuccessRate)}</td>
                            <td className="tabular-nums">{formatRate(p.cancellationRate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableFrame>
              </>
            )}
          </TabsContent>

          <TabsContent value="cities" className="space-y-3">
            {bundle.cities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No city data in this range.</p>
            ) : (
              <>
                <CsvButton
                  filename={`cities-${bundle.range.start}-${bundle.range.end}.csv`}
                  csv={rowsToCsv(
                    bundle.cities.map((c) => ({
                      city: c.city,
                      placed: c.ordersPlaced,
                      delivered: c.ordersDelivered,
                      cancelled: c.ordersCancelled,
                      deliveredRevenue: c.deliveredRevenue,
                      deliveryRate: c.deliverySuccessRate,
                      cancelRate: c.cancellationRate,
                    })),
                    [
                      { key: "city", header: "City" },
                      { key: "placed", header: "Placed" },
                      { key: "delivered", header: "Delivered" },
                      { key: "cancelled", header: "Cancelled" },
                      { key: "deliveredRevenue", header: "Delivered revenue" },
                      { key: "deliveryRate", header: "Delivery rate" },
                      { key: "cancelRate", header: "Cancel rate" },
                    ]
                  )}
                />
                <TableFrame>
                <table>
                  <thead>
                    <tr>
                      <th>City</th>
                      <th>Placed</th>
                      <th>Confirmed</th>
                      <th>Delivered</th>
                      <th>Cancelled</th>
                      <th>Delivered revenue</th>
                      <th>Delivery rate</th>
                      <th>Cancel rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.cities.map((c) => (
                      <tr key={c.city} className="border-b last:border-0">
                        <td>
                          <button
                            type="button"
                            className="font-medium hover:underline"
                            onClick={() => void openDrill(c.city, c.orderIds)}
                          >
                            {c.city}
                          </button>
                        </td>
                        <td className="tabular-nums">{c.ordersPlaced}</td>
                        <td className="text-[var(--g-taupe)]">Not available</td>
                        <td className="tabular-nums">{c.ordersDelivered}</td>
                        <td className="tabular-nums">{c.ordersCancelled}</td>
                        <td className="tabular-nums">{formatMoney(c.deliveredRevenue)}</td>
                        <td className="tabular-nums">{formatRate(c.deliverySuccessRate)}</td>
                        <td className="tabular-nums">{formatRate(c.cancellationRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
              </>
            )}
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {([bundle.customers.firstTime, bundle.customers.repeat] as const).map((row) => (
                <Card key={row.cohort} className="admin-analytics-tile">
                  <p className="admin-analytics-tile-label">
                    {row.cohort === "first-time" ? "First-time customers" : "Repeat customers"}
                  </p>
                  <p className="admin-analytics-tile-value">{row.customers}</p>
                  <p className="admin-analytics-tile-hint">
                    Orders in range: {row.orderCount} · Delivered: {row.deliveredOrderCount}
                  </p>
                  <p className="mt-1 text-sm text-[var(--g-charcoal)]">
                    Delivered revenue: {formatMoney(row.deliveredRevenue)}
                  </p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricButton label="30-day reorder rate" value={formatRate(bundle.customers.reorderRate30)} />
              <MetricButton label="60-day reorder rate" value={formatRate(bundle.customers.reorderRate60)} />
              <MetricButton label="90-day reorder rate" value={formatRate(bundle.customers.reorderRate90)} />
            </div>
            {bundle.customers.skippedNoEmail > 0 ? (
              <p className="text-sm text-muted-foreground">
                {bundle.customers.skippedNoEmail} orders had no email or phone and were not merged into
                customer stats.
              </p>
            ) : null}
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <RetentionBanner show={bundle.retentionNotice} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetricButton label="Unique visitors" value={formatCount(bundle.traffic.visitors)} />
              <MetricButton label="Sessions" value={formatCount(bundle.traffic.sessions)} />
              <MetricButton
                label="Converted Sessions"
                value={formatCount(bundle.traffic.convertedSessions)}
                hint="Sessions linked to ≥1 successful order"
              />
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Sessions by source</h2>
              {bundle.traffic.bySource == null ? (
                <p className="text-sm text-muted-foreground">Not available</p>
              ) : bundle.traffic.bySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions in this range.</p>
              ) : (
                <TableFrame>
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.traffic.bySource.map((row) => (
                        <tr key={row.source} className="border-b last:border-0">
                          <td>{displaySource(row.source)}</td>
                          <td className="tabular-nums">{row.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Landing pages</h2>
              {bundle.traffic.landingPages == null ? (
                <p className="text-sm text-muted-foreground">Not available</p>
              ) : bundle.traffic.landingPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No landing pages in this range.</p>
              ) : (
                <TableFrame>
                  <table>
                    <thead>
                      <tr>
                        <th>Path</th>
                        <th>Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.traffic.landingPages.map((row) => (
                        <tr key={row.path} className="border-b last:border-0">
                          <td>{row.path}</td>
                          <td className="tabular-nums">{row.sessions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Money by source</h2>
              <p className="mb-3 text-sm text-[var(--g-taupe)]">
                Enter what you spent on ads in this same date range. ROAS stays blank until spend is
                greater than zero — we will not invent it.
              </p>
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from(
                  new Set([
                    "tiktok",
                    "meta",
                    "google",
                    "other",
                    ...bundle.sourceMoney
                      .map((row) => row.source)
                      .filter((source) => source !== "unattributed"),
                  ])
                ).map((source) => (
                  <div key={source} className="space-y-1.5">
                    <Label htmlFor={`spend-${source}`}>{displaySource(source)} spend</Label>
                    <Input
                      id={`spend-${source}`}
                      inputMode="decimal"
                      value={spendDraft[source] ?? ""}
                      onChange={(e) =>
                        setSpendDraft((current) => ({ ...current, [source]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void saveSpend()} disabled={spendSaving}>
                  {spendSaving ? "Saving…" : "Save spend for this range"}
                </Button>
                {spendError ? <p className="text-sm text-destructive">{spendError}</p> : null}
              </div>
              {bundle.sourceMoney.length === 0 ? (
                <p className="text-sm text-muted-foreground">No source money in this range.</p>
              ) : (
                <>
                  <CsvButton
                    filename={`sources-${bundle.range.start}-${bundle.range.end}.csv`}
                    csv={rowsToCsv(
                      bundle.sourceMoney.map((row) => ({
                        source: displaySource(row.source),
                        placed: row.placedCount,
                        delivered: row.deliveredCount,
                        deliveredRevenue: row.deliveredRevenue,
                        lost: row.lost,
                        waiting: row.waiting,
                        spend: row.spend,
                        roas: row.roas,
                      })),
                      [
                        { key: "source", header: "Source" },
                        { key: "placed", header: "Placed" },
                        { key: "delivered", header: "Delivered" },
                        { key: "deliveredRevenue", header: "Delivered revenue" },
                        { key: "lost", header: "Lost to cancels" },
                        { key: "waiting", header: "Still moving" },
                        { key: "spend", header: "Ad spend" },
                        { key: "roas", header: "ROAS" },
                      ]
                    )}
                  />
                  <TableFrame>
                    <table>
                      <thead>
                        <tr>
                          <th>Source</th>
                          <th>Placed</th>
                          <th>Delivered</th>
                          <th>Delivered revenue</th>
                          <th>Lost to cancels</th>
                          <th>Still moving</th>
                          <th>Ad spend</th>
                          <th>ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundle.sourceMoney.map((row) => (
                          <tr key={row.source} className="border-b last:border-0">
                            <td>
                              <button
                                type="button"
                                className="font-medium hover:underline"
                                onClick={() => void openDrill(displaySource(row.source), row.orderIds)}
                              >
                                {displaySource(row.source)}
                              </button>
                            </td>
                            <td className="tabular-nums">{row.placedCount}</td>
                            <td className="tabular-nums">{row.deliveredCount}</td>
                            <td className="tabular-nums">{formatMoney(row.deliveredRevenue)}</td>
                            <td className="tabular-nums">{formatMoney(row.lost)}</td>
                            <td className="tabular-nums">{formatMoney(row.waiting)}</td>
                            <td className="tabular-nums">
                              {row.spend > 0 ? formatMoney(row.spend) : "—"}
                            </td>
                            <td className="tabular-nums">
                              {row.roas == null ? "Not available" : `${Math.round(row.roas * 100) / 100}×`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableFrame>
                </>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">
                Delivered Orders by Source — delivered during selected period
              </h2>
              {bundle.traffic.deliveredBySource.length === 0 ? (
                <p className="text-sm text-muted-foreground">No delivered orders in this range.</p>
              ) : (
                <TableFrame>
                  <table>
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Orders</th>
                        <th>Delivered revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.traffic.deliveredBySource.map((row) => (
                        <tr key={row.source} className="border-b last:border-0">
                          <td>{displaySource(row.source)}</td>
                          <td className="tabular-nums">{row.orders}</td>
                          <td className="tabular-nums">{formatMoney(row.deliveredRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
              )}
            </div>
          </TabsContent>

          <TabsContent value="funnel" className="space-y-8">
            <RetentionBanner show={bundle.retentionNotice} />
            <AnalyticsFunnelPanel
              title="Shop conversion"
              description="Sessions that started in this date range — how many reached each shopping step."
              steps={bundle.shopFunnel}
              empty={
                <p>
                  Shop funnel not available for this range (traffic retention or
                  no session data).
                </p>
              }
            />
            <AnalyticsFunnelPanel
              title="COD / fulfillment"
              description="Orders placed in this range — how many ever reached each status. Click a step to list those orders."
              steps={bundle.funnel}
              onStepClick={(step) => {
                const full = bundle.funnel.find((s) => s.key === step.key);
                if (full) void openDrill(full.label, full.orderIds);
              }}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <RetentionBanner show={bundle.retentionNotice} />
            {bundle.insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">No insights for this range.</p>
            ) : (
              <ul className="space-y-3">
                {bundle.insights.map((card) => (
                  <li key={card.id}>
                    <Card
                      className={cn(
                        "admin-analytics-panel space-y-3 px-4 py-4",
                        card.confidence === "HIGH"
                          ? "admin-analytics-insight-high"
                          : "admin-analytics-insight-medium"
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold text-[var(--g-charcoal)]">{card.title}</h2>
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--g-sage)]">
                          {card.confidence}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Evidence</h3>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {card.evidence.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Possible causes</h3>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {card.possibleCauses.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">Recommended checks</h3>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {card.recommendedChecks.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="query" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="metric">Metric</Label>
                <select
                  id="metric"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as AnalyticsMetric)}
                >
                  {ANALYTICS_METRICS.map((m) => (
                    <option key={m} value={m}>
                      {METRIC_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dimension">Group by</Label>
                <select
                  id="dimension"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value as "" | AnalyticsDimension)}
                >
                  <option value="">None</option>
                  {ANALYTICS_DIMENSIONS.map((d) => (
                    <option key={d} value={d}>
                      {DIM_LABEL[d]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void runQuery()}>
                Run
              </Button>
              <Input
                placeholder="Save as… e.g. Lahore 30-Day Delivery"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="max-w-sm"
                aria-label="Saved report name"
              />
              <Button type="button" variant="outline" onClick={() => void saveReport()} disabled={!saveName.trim()}>
                Save report
              </Button>
            </div>
            {queryError ? <p className="text-sm text-destructive">{queryError}</p> : null}
            {queryRows ? (
              queryRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rows.</p>
              ) : (
                <TableFrame>
                  <table>
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queryRows.map((row) => (
                        <tr key={row.label} className="border-b last:border-0">
                          <td>
                            <button
                              type="button"
                              className="hover:underline"
                              onClick={() => void openDrill(row.label, row.orderIds)}
                            >
                              {row.label}
                            </button>
                          </td>
                          <td className="tabular-nums">
                            {metric === "deliveryRate" || metric === "cancellationRate"
                              ? formatRate(row.value)
                              : metric === "ordersPlaced" || metric === "ordersDelivered"
                                ? row.value == null
                                  ? "Not available"
                                  : String(row.value)
                                : formatMoney(row.value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableFrame>
              )
            ) : null}
            {reports.length > 0 ? (
              <div>
                <h2 className="mb-2 text-lg font-semibold">Saved reports</h2>
                <ul className="admin-analytics-panel divide-y">
                  {reports.map((r) => (
                    <li key={r.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => {
                          const q = r.query;
                          if (typeof q.metric === "string") setMetric(q.metric as AnalyticsMetric);
                          setDimension((q.dimension as AnalyticsDimension) || "");
                          void runQuery(q);
                        }}
                      >
                        {r.name}
                      </button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void removeReport(r.id)}>
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      ) : null}

      {drillTitle ? (
        <section className="admin-analytics-panel">
          <div className="admin-analytics-panel-head flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[var(--g-charcoal)]">{drillTitle}</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDrillTitle(null);
                setDrillOrders([]);
              }}
            >
              Close
            </Button>
          </div>
          <div className="p-3 sm:p-4">
          {drillLoading ? (
            <p className="text-sm text-[var(--g-taupe)]">Loading orders…</p>
          ) : drillOrders.length === 0 ? (
            <p className="text-sm text-[var(--g-taupe)]">No orders in this total.</p>
          ) : (
            <TableFrame>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>City</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {drillOrders.map((o) => (
                    <tr key={o.orderId}>
                      <td className="font-medium">
                        <Link href={`/admin/orders/${encodeURIComponent(o.orderId)}`} className="hover:underline">
                          {o.orderId}
                        </Link>
                      </td>
                      <td>{formatWhen(o.createdAt)}</td>
                      <td>{STATUS_LABEL[o.status] ?? o.status}</td>
                      <td>{o.city}</td>
                      <td className="tabular-nums">{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableFrame>
          )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
