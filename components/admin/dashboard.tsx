import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, TrendingUp, Package, AlertCircle, RefreshCcw, DollarSign, Pickaxe, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { telHref, whatsappHref } from "@/lib/contact-links";
import type { DashboardSnapshot } from "@/lib/db/dashboard-rules";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  description?: string;
  icon?: any;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ContactActions({ phone }: { phone: string }) {
  const wa = whatsappHref(phone);
  const tel = telHref(phone);
  if (!wa && !tel) return null;
  return (
    <span className="flex shrink-0 items-center gap-3 text-xs font-medium mr-2">
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--g-forest)] underline-offset-2 hover:underline inline-flex items-center gap-1"
        >
          WhatsApp
        </a>
      ) : null}
      {tel ? (
        <a
          href={tel}
          className="text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1"
        >
          Call
        </a>
      ) : null}
    </span>
  );
}

export function Dashboard({
  snapshot,
  error,
}: {
  snapshot?: DashboardSnapshot;
  error?: boolean;
}) {
  if (error || !snapshot) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-destructive">
          Could not load the overview. Open Orders and try again.
        </p>
      </div>
    );
  }

  const needsYou: {
    key: string;
    kind: "order" | "link";
    href: string;
    phone?: string;
    body: ReactNode;
  }[] = [];

  for (const o of snapshot.pendingOrders) {
    needsYou.push({
      key: `order-${o.orderId}`,
      kind: "order",
      href: `/admin/orders/${encodeURIComponent(o.orderId)}`,
      phone: o.phone,
      body: (
        <span className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
          <span className="font-semibold">{o.orderId}</span>
          <span className="text-muted-foreground line-clamp-1">{o.customerName || "—"}</span>
          <Badge variant="secondary" className="w-fit text-xs px-2 py-0 h-5">
            {STATUS_LABEL[o.status] ?? o.status}
          </Badge>
          <span className="tabular-nums font-medium sm:ml-auto">{formatPrice(o.total)}</span>
        </span>
      ),
    });
  }

  for (const o of snapshot.shippedStaleOrders) {
    needsYou.push({
      key: `stale-${o.orderId}`,
      kind: "order",
      href: `/admin/orders/${encodeURIComponent(o.orderId)}`,
      phone: o.phone,
      body: (
        <span className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
          <span className="font-semibold">{o.orderId}</span>
          <span className="text-muted-foreground line-clamp-1">{o.customerName || "—"}</span>
          <Badge variant="destructive" className="w-fit text-xs px-2 py-0 h-5">
            Shipped {o.daysShipped}d ago
          </Badge>
        </span>
      ),
    });
  }

  if (snapshot.shippedWaitingCount > 0 && snapshot.shippedStaleOrders.length < snapshot.shippedWaitingCount) {
    needsYou.push({
      key: "shipped",
      kind: "link",
      href: "/admin/orders?status=shipped",
      body: (
        <span className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="font-medium">{snapshot.shippedWaitingCount} shipped orders</span>
          <span className="text-muted-foreground text-sm">waiting to be marked as delivered</span>
        </span>
      ),
    });
  }

  for (const p of snapshot.lowStockProducts) {
    needsYou.push({
      key: `stock-${p.id}`,
      kind: "link",
      href: `/admin/products/${p.id}`,
      body: (
        <span className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
          <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 hidden sm:block" />
          <span className="font-medium line-clamp-1">{p.name}</span>
          <span className="text-muted-foreground text-sm sm:ml-auto hover:text-foreground">
            {p.stockStatus === "out-of-stock" ? "Sold out" : "Low stock"}
          </span>
        </span>
      ),
    });
  }

  if (snapshot.pendingReviewCount > 0) {
    needsYou.push({
      key: "reviews",
      kind: "link",
      href: "/admin/reviews",
      body: (
         <span className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <span className="font-medium">{snapshot.pendingReviewCount} new reviews</span>
          <span className="text-muted-foreground text-sm">require your approval</span>
        </span>
      ),
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 md:flex-row justify-between md:items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
             Here's what is happening with your store today. For deep insights, visit{" "}
            <Link href="/admin/analytics" className="underline-offset-4 hover:underline text-primary">
              Analytics
            </Link>.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Rolling 30 Days (Profit/Loss Concept) */}
        <MetricCard
          title="Revenue (30d)"
          value={formatPrice(snapshot.monthRevenue)}
          description={`${snapshot.monthOrderCount} orders placed`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Delivered (30d Profit Base)"
          value={formatPrice(snapshot.monthDeliveredRevenue)}
          description="Total value of successfully delivered orders"
          icon={CheckCircle2}
        />
        <MetricCard
          title="Cancelled (30d Loss)"
          value={formatPrice(snapshot.monthCancelledRevenue)}
          description="Total value of cancelled/failed orders"
          icon={AlertCircle}
        />
        <MetricCard
          title="To Fulfill"
          value={String(snapshot.pendingCount)}
          description={`${snapshot.shippedWaitingCount} currently shipped & waiting`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {/* Today Metrics */}
         <MetricCard
          title="Today's Sales"
          value={formatPrice(snapshot.todayRevenue)}
          description={`${snapshot.todayOrderCount} orders today`}
          icon={DollarSign}
          className="bg-primary/5 border-primary/20"
        />
        <MetricCard
          title="Delivered Today"
          value={String(snapshot.deliveredTodayCount)}
          icon={CheckCircle2}
        />
        <MetricCard
          title="Cancelled Today"
          value={String(snapshot.cancelledTodayCount)}
          icon={AlertCircle}
        />
        <MetricCard
          title="Stock Alerts"
          value={String(snapshot.lowStockCount)}
          description="Products requiring attention"
          icon={AlertCircle}
        />
      </div>

      {needsYou.length > 0 ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Tasks needing action</CardTitle>
            <CardDescription>
              Orders to fulfill, stale shipments, and inventory warnings.
            </CardDescription>
          </CardHeader>
          <div className="divide-y border-t">
            {needsYou.map((row) => (
              <div
                key={row.key}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <Link
                  href={row.href}
                  className="flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {row.body}
                </Link>
                <div className="flex items-center gap-3 self-end sm:self-auto mt-2 sm:mt-0">
                  {row.kind === "order" && <ContactActions phone={row.phone ?? ""} />}
                  <Link
                    href={row.href}
                    className="shrink-0 text-muted-foreground opacity-50 transition-all group-hover:opacity-100 p-2 border rounded-md group-hover:bg-background"
                    aria-label="View details"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground bg-muted/20 border-dashed">
          <CheckCircle2 className="h-10 w-10 mb-4 opacity-20" />
          <p className="font-medium text-foreground">You're all caught up!</p>
          <p className="text-sm mt-1">No pending actions or urgent alerts right now.</p>
        </Card>
      )}

      {snapshot.practiceOrderCount > 0 ? (
        <p className="text-xs text-muted-foreground text-center pt-4">
          {snapshot.practiceOrderCount} practice orders are purposefully hidden from these metrics.
        </p>
      ) : null}
    </div>
  );
}
