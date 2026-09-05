"use client";

import { Card } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import type {
  CheckoutFieldRow,
  FulfillmentHours,
  MissingCostRow,
  MoneyStory,
  PeriodComparison,
  PeriodDelta,
  ProfitAlert,
  RtoProxy,
} from "@/lib/db/analytics-profit-rules";

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "Not available";
  return formatPrice(n);
}

function formatHours(n: number | null | undefined): string {
  if (n == null) return "Not enough timestamps";
  if (n >= 48) return `${Math.round((n / 24) * 10) / 10} days`;
  const rounded = Math.round(n * 10) / 10;
  return `${rounded} hour${rounded === 1 ? "" : "s"}`;
}

function formatDelta(delta: PeriodDelta, kind: "money" | "count" | "rate"): string {
  if (delta.pct == null) {
    if (delta.previous == null || delta.previous === 0) return "No last-period number";
    return "Same as last period";
  }
  const pct = Math.round(delta.pct * 1000) / 10;
  if (pct === 0) return "Same as last period";
  const direction = pct > 0 ? "Up" : "Down";
  if (kind === "rate" && delta.current != null && delta.previous != null) {
    const now = Math.round(delta.current * 1000) / 10;
    const then = Math.round(delta.previous * 1000) / 10;
    return `${direction} ${Math.abs(pct)}% · now ${now}%, last ${then}%`;
  }
  return `${direction} ${Math.abs(pct)}% vs last period`;
}

function deltaClass(pct: number | null, invert = false): string {
  if (pct == null || pct === 0) return "";
  const up = invert ? pct < 0 : pct > 0;
  return up ? "admin-analytics-delta-up" : "admin-analytics-delta-down";
}

export function AnalyticsProfitBoard({
  story,
  comparison,
  alerts,
  rto,
  missingCosts,
  fulfillment,
  checkoutFields,
  onDrill,
}: {
  story: MoneyStory;
  comparison: PeriodComparison;
  alerts: ProfitAlert[];
  rto: RtoProxy;
  missingCosts: MissingCostRow[];
  fulfillment: FulfillmentHours;
  checkoutFields: CheckoutFieldRow[];
  onDrill: (title: string, ids: string[]) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="admin-analytics-story" aria-labelledby="analytics-plain-title">
        <p className="admin-analytics-story-health">{story.health}</p>
        <h2 id="analytics-plain-title" className="text-xl text-[var(--g-charcoal)]">
          Of {formatMoney(story.booked)} you booked this period, {formatMoney(story.kept)} is in
          hand, {formatMoney(story.lost)} was cancelled, and {formatMoney(story.waiting)} is still
          moving.
        </h2>
        <p className="text-sm text-[var(--g-taupe)]">
          Average delivered order {formatMoney(story.deliveredAov)}. Last period was{" "}
          {comparison.previousRange.start} to {comparison.previousRange.end}.
        </p>
        <div className="admin-analytics-per100" aria-label="Out of 100 orders">
          <div className="admin-analytics-per100-item">
            <p className="admin-analytics-tile-label">Delivered</p>
            <p className="admin-analytics-tile-value">{story.per100.delivered}</p>
            <p className="admin-analytics-tile-hint">out of every 100 orders</p>
          </div>
          <div className="admin-analytics-per100-item">
            <p className="admin-analytics-tile-label">Cancelled</p>
            <p className="admin-analytics-tile-value">{story.per100.cancelled}</p>
            <p className="admin-analytics-tile-hint">out of every 100 orders</p>
          </div>
          <div className="admin-analytics-per100-item">
            <p className="admin-analytics-tile-label">Still moving</p>
            <p className="admin-analytics-tile-value">{story.per100.waiting}</p>
            <p className="admin-analytics-tile-hint">out of every 100 orders</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <button
          type="button"
          className="admin-analytics-tile admin-analytics-tile-primary"
          onClick={() => onDrill("Money in hand", story.keptOrderIds)}
        >
          <p className="admin-analytics-tile-label">Money in hand</p>
          <p className="admin-analytics-tile-value">{formatMoney(story.kept)}</p>
          <p className="admin-analytics-tile-hint">
            {story.keptCount} delivered of orders you took in this range
          </p>
        </button>
        <button
          type="button"
          className="admin-analytics-tile"
          onClick={() => onDrill("Lost to cancels", story.lostOrderIds)}
        >
          <p className="admin-analytics-tile-label">Lost to cancels</p>
          <p className="admin-analytics-tile-value">{formatMoney(story.lost)}</p>
          <p className="admin-analytics-tile-hint">{story.lostCount} cancelled · not cash</p>
        </button>
        <button
          type="button"
          className="admin-analytics-tile"
          onClick={() => onDrill("Still moving", story.waitingOrderIds)}
        >
          <p className="admin-analytics-tile-label">Still moving</p>
          <p className="admin-analytics-tile-value">{formatMoney(story.waiting)}</p>
          <p className="admin-analytics-tile-hint">Can still cancel until delivered</p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="admin-analytics-tile">
          <p className="admin-analytics-tile-label">Delivered money vs last period</p>
          <p
            className={cn(
              "admin-analytics-tile-value",
              deltaClass(comparison.deliveredRevenue.pct)
            )}
          >
            {formatDelta(comparison.deliveredRevenue, "money")}
          </p>
          <p className="admin-analytics-tile-hint">
            Now {formatMoney(comparison.deliveredRevenue.current)} · last{" "}
            {formatMoney(comparison.deliveredRevenue.previous)}
          </p>
        </Card>
        <Card className="admin-analytics-tile">
          <p className="admin-analytics-tile-label">Cancel rate vs last period</p>
          <p
            className={cn(
              "admin-analytics-tile-value",
              deltaClass(comparison.cancellationRate.pct, true)
            )}
          >
            {formatDelta(comparison.cancellationRate, "rate")}
          </p>
        </Card>
        <Card className="admin-analytics-tile">
          <p className="admin-analytics-tile-label">Orders taken vs last period</p>
          <p className={cn("admin-analytics-tile-value", deltaClass(comparison.ordersPlaced.pct))}>
            {formatDelta(comparison.ordersPlaced, "count")}
          </p>
          <p className="admin-analytics-tile-hint">
            Now {comparison.ordersPlaced.current ?? 0} · last {comparison.ordersPlaced.previous ?? 0}
          </p>
        </Card>
      </div>

      {alerts.length > 0 ? (
        <section aria-labelledby="analytics-watch-title" className="space-y-2">
          <h2 id="analytics-watch-title" className="text-lg font-semibold text-[var(--g-charcoal)]">
            Watch these
          </h2>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className={cn(
                  "admin-analytics-alert",
                  alert.severity === "urgent" && "admin-analytics-alert-urgent"
                )}
              >
                <p className="font-semibold text-[var(--g-charcoal)]">{alert.title}</p>
                <p className="mt-1 text-sm text-[var(--g-taupe)]">{alert.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="admin-analytics-tile">
          <p className="admin-analytics-tile-label">Likely returns after ship</p>
          <p className="admin-analytics-tile-value">{rto.count}</p>
          <p className="admin-analytics-tile-hint">{rto.disclaimer}</p>
          {rto.count > 0 ? (
            <button
              type="button"
              className="mt-2 text-left text-sm font-medium underline"
              onClick={() => onDrill("Shipped then cancelled", rto.orderIds)}
            >
              {formatMoney(rto.revenue)} in those orders · {rto.cancelledBeforeShip} cancelled
              before ship
            </button>
          ) : (
            <p className="mt-2 text-sm text-[var(--g-taupe)]">
              {rto.cancelledBeforeShip} cancelled before ship
            </p>
          )}
        </Card>
        <Card className="admin-analytics-tile">
          <p className="admin-analytics-tile-label">Median time to move an order</p>
          <p className="admin-analytics-tile-value">{formatHours(fulfillment.placedToDelivered)}</p>
          <p className="admin-analytics-tile-hint">
            Pack {formatHours(fulfillment.placedToProcessing)} · courier{" "}
            {formatHours(fulfillment.processingToShipped)} · last mile{" "}
            {formatHours(fulfillment.shippedToDelivered)}
          </p>
        </Card>
      </div>

      {missingCosts.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--g-charcoal)]">
            Fill these costs to see profit
          </h2>
          <ul className="space-y-1 text-sm text-[var(--g-charcoal)]">
            {missingCosts.map((row) => (
              <li key={row.slug}>
                {row.name} · {row.quantityDelivered} delivered with no cost price
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {checkoutFields.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--g-charcoal)]">
            Checkout fields people fail
          </h2>
          <ul className="space-y-1 text-sm text-[var(--g-charcoal)]">
            {checkoutFields.map((row) => (
              <li key={row.field}>
                {row.field}: {row.count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
