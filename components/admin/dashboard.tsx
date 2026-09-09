import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { telHref, whatsappHref } from "@/lib/contact-links";
import type { DashboardSnapshot } from "@/lib/db/dashboard-rules";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function Tile({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}, ${value}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="flex min-h-11 flex-col justify-center px-4 py-4 transition-colors hover:bg-accent">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </Card>
    </Link>
  );
}

function Row({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Link>
  );
}

function ContactActions({ phone }: { phone: string }) {
  const wa = whatsappHref(phone);
  const tel = telHref(phone);
  if (!wa && !tel) return null;
  return (
    <span className="flex shrink-0 items-center gap-2 text-xs font-medium">
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--g-forest)] underline-offset-2 hover:underline"
        >
          WhatsApp
        </a>
      ) : null}
      {tel ? (
        <a
          href={tel}
          className="text-[var(--g-forest)] underline-offset-2 hover:underline"
        >
          Call
        </a>
      ) : null}
    </span>
  );
}

function OrderFollowUpRow({
  href,
  phone,
  children,
}: {
  href: string;
  phone: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted/30">
      <Link
        href={href}
        className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </Link>
      <ContactActions phone={phone} />
      <Link href={href} className="shrink-0 text-muted-foreground" aria-hidden>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
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
        <h1 className="text-2xl font-semibold">Home</h1>
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
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-medium">{o.orderId}</span>
          <span>{o.customerName || "—"}</span>
          <span className="text-muted-foreground">
            {STATUS_LABEL[o.status] ?? o.status}
          </span>
          <span className="tabular-nums">{formatPrice(o.total)}</span>
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
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="font-medium">{o.orderId}</span>
          <span>{o.customerName || "—"}</span>
          <span className="text-muted-foreground">
            Shipped {o.daysShipped}d — confirm delivery
          </span>
        </span>
      ),
    });
  }

  if (
    snapshot.shippedWaitingCount > 0 &&
    snapshot.shippedStaleOrders.length < snapshot.shippedWaitingCount
  ) {
    needsYou.push({
      key: "shipped",
      kind: "link",
      href: "/admin/orders?status=shipped",
      body: (
        <span>
          {snapshot.shippedWaitingCount} shipped total
          {snapshot.shippedStaleOrders.length > 0
            ? ` (${snapshot.shippedStaleOrders.length} overdue)`
            : ""}
        </span>
      ),
    });
  } else if (
    snapshot.shippedWaitingCount > 0 &&
    snapshot.shippedStaleOrders.length === 0
  ) {
    needsYou.push({
      key: "shipped",
      kind: "link",
      href: "/admin/orders?status=shipped",
      body: (
        <span>
          {snapshot.shippedWaitingCount} shipped, waiting to mark delivered
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
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium">{p.name}</span>
          <span className="text-muted-foreground">
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
      body: <span>{snapshot.pendingReviewCount} reviews waiting</span>,
    });
  }

  if (snapshot.draftProductCount > 0) {
    const href =
      snapshot.draftProductCount === 1 && snapshot.firstDraftProductId
        ? `/admin/products/${snapshot.firstDraftProductId}`
        : "/admin/products";
    needsYou.push({
      key: "drafts",
      kind: "link",
      href,
      body: (
        <span>
          {snapshot.draftProductCount} product{" "}
          {snapshot.draftProductCount === 1 ? "draft" : "drafts"}
        </span>
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link
            href="/admin/analytics"
            className="underline-offset-4 hover:underline"
          >
            Analytics
          </Link>{" "}
          shows delivered revenue for a date range. These tiles are today only.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Tile
          href="/admin/orders"
          label="Today’s orders"
          value={String(snapshot.todayOrderCount)}
        />
        <Tile
          href="/admin/orders"
          label="Today’s money"
          value={formatPrice(snapshot.todayRevenue)}
        />
        <Tile
          href="/admin/orders?status=pending"
          label="Pending"
          value={String(snapshot.pendingCount)}
        />
        <Tile
          href="/admin/orders?status=delivered"
          label="Delivered today"
          value={String(snapshot.deliveredTodayCount)}
        />
        <Tile
          href="/admin/orders?status=cancelled"
          label="Cancelled today"
          value={String(snapshot.cancelledTodayCount)}
        />
        <Tile
          href="/admin/products?stock=attention"
          label="Low stock"
          value={String(snapshot.lowStockCount)}
        />
      </div>
      {needsYou.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Needs you</h2>
          <div className={cn("overflow-hidden rounded-lg border")}>
            {needsYou.map((row) =>
              row.kind === "order" ? (
                <OrderFollowUpRow
                  key={row.key}
                  href={row.href}
                  phone={row.phone ?? ""}
                >
                  {row.body}
                </OrderFollowUpRow>
              ) : (
                <Row key={row.key} href={row.href}>
                  {row.body}
                </Row>
              ),
            )}
          </div>
        </section>
      ) : null}
      {snapshot.practiceOrderCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          {snapshot.practiceOrderCount} practice orders hidden
        </p>
      ) : null}
    </div>
  );
}
