"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applyCoachBudget,
  type CoachBundle,
  type CoachHealth,
  type CoachProductRow,
} from "@/lib/db/analytics-coach-rules";
import type { SourceMoneyRow } from "@/lib/db/analytics-profit-rules";
import { adminFetch } from "@/components/admin/admin-fetch";
import { cn, formatPrice } from "@/lib/utils";

const HEALTH_LABEL: Record<CoachHealth, string> = {
  performing: "Performing",
  needs_improvement: "Needs improvement",
  weak: "Weak",
};

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "Not available";
  return formatPrice(n);
}

function channelName(source: string): string {
  if (source === "meta") return "Facebook / Meta";
  if (source === "tiktok") return "TikTok";
  if (source === "google") return "Google";
  if (source === "direct") return "Direct";
  return source;
}

function verdictLine(row: CoachProductRow): string {
  if (row.verdict === "fill_cost") return "Fill cost first";
  if (row.verdict === "too_cheap") return `Too cheap · do not go below ${formatMoney(row.floor)}`;
  if (row.verdict === "not_enough_data") return "Not enough deliveries to set a floor";
  return `Safe · floor ${formatMoney(row.floor)}`;
}

export function AnalyticsCoachPanel({
  coach,
  sourceMoney,
  onSaved,
}: {
  coach: CoachBundle;
  sourceMoney: SourceMoneyRow[];
  onSaved: () => void;
}) {
  const [budget, setBudget] = useState(String(coach.defaultBudget || ""));
  const [packingFee, setPackingFee] = useState(coach.packingFee ? String(coach.packingFee) : "");
  const [codFee, setCodFee] = useState(coach.codFee ? String(coach.codFee) : "");
  const [costs, setCosts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const product of coach.products) {
      if (product.costPrice == null) next[product.slug] = "";
      else next[product.slug] = String(product.costPrice);
    }
    return next;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budgetNumber = Number(budget);
  const live = useMemo(
    () => applyCoachBudget(coach, Number.isFinite(budgetNumber) && budgetNumber > 0 ? budgetNumber : 0, sourceMoney),
    [budgetNumber, coach, sourceMoney]
  );

  const missing = live.products.filter((p) => p.costPrice == null);
  const performing = live.products.filter((p) => p.health === "performing");
  const improve = live.products.filter((p) => p.health === "needs_improvement");
  const weak = live.products.filter((p) => p.health === "weak");

  async function saveCosts() {
    setSaving(true);
    setError(null);
    const items = Object.entries(costs)
      .map(([slug, value]) => ({ slug, costPrice: Number(value) }))
      .filter((item) => {
        const raw = costs[item.slug];
        if (raw == null || String(raw).trim() === "") return false;
        return Number.isFinite(item.costPrice) && item.costPrice >= 0;
      });
    const packing = Number(packingFee);
    const cod = Number(codFee);
    try {
      await adminFetch("/api/admin/analytics/costs", {
        method: "POST",
        body: JSON.stringify({
          items,
          packingFee: Number.isFinite(packing) && packing >= 0 ? packing : 0,
          codFee: Number.isFinite(cod) && cod >= 0 ? cod : 0,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save costs.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-analytics-story">
        <p className="admin-analytics-story-health">Advice only</p>
        <h2 className="text-xl text-[var(--g-charcoal)]">
          Fill costs, keep prices above the floor, then put ads on products that already deliver cash.
        </h2>
        <p className="text-sm text-[var(--g-taupe)]">
          Safe price uses what customers actually paid, real shipping (including free shipping), packing
          and COD fees you type, and cancel/RTO leak from parcels older than{" "}
          {Math.round(coach.maturityHours / 24)} days. About {Math.round(coach.targetBuffer * 100)}% leftover
          is kept before ads. In-transit parcels are not treated as failed. This does not run Meta or
          TikTok for you.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--g-charcoal)]">1. Your cost</h3>
        {missing.length === 0 ? (
          <p className="text-sm text-[var(--g-taupe)]">Every listed product has a cost. You can still edit them below.</p>
        ) : (
          <p className="text-sm text-[var(--g-taupe)]">
            {missing.length} product{missing.length === 1 ? "" : "s"} still need a cost. Profit and ads
            advice stay off until you fill them.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {live.products.map((product) => (
            <label key={product.slug} className="admin-analytics-tile gap-2">
              <span className="admin-analytics-tile-label">{product.name}</span>
              <Input
                inputMode="decimal"
                value={costs[product.slug] ?? ""}
                onChange={(e) => setCosts((current) => ({ ...current, [product.slug]: e.target.value }))}
                aria-label={`Cost for ${product.name}`}
              />
              <span className="admin-analytics-tile-hint">
                Listed {formatMoney(product.listedPrice)}
                {product.sellingPrice !== product.listedPrice
                  ? ` · customers paid ${formatMoney(product.sellingPrice)}`
                  : ""}
              </span>
            </label>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="admin-analytics-tile gap-2">
            <Label htmlFor="coach-packing">Packing / handling per order (PKR)</Label>
            <Input
              id="coach-packing"
              inputMode="decimal"
              value={packingFee}
              onChange={(e) => setPackingFee(e.target.value)}
            />
            <p className="admin-analytics-tile-hint">Tape, bag, packing. Leave 0 if you do not track it.</p>
          </div>
          <div className="admin-analytics-tile gap-2">
            <Label htmlFor="coach-cod">COD handling per order (PKR)</Label>
            <Input
              id="coach-cod"
              inputMode="decimal"
              value={codFee}
              onChange={(e) => setCodFee(e.target.value)}
            />
            <p className="admin-analytics-tile-hint">
              Courier cash-collection fee. Prepaid parcels skip this. Leave 0 if you do not know it.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void saveCosts()} disabled={saving}>
            {saving ? "Saving…" : "Save costs and fees"}
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--g-charcoal)]">2. How much you can spend on ads this period</h3>
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="coach-budget">Budget (PKR)</Label>
          <Input
            id="coach-budget"
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
          <p className="text-xs text-[var(--g-taupe)]">
            Starts from spend you already typed on Traffic. Change it to see a new split. Nothing is
            sent to Meta or TikTok.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {live.channels.map((channel) => (
            <Card key={channel.source} className="admin-analytics-tile">
              <p className="admin-analytics-tile-label">{channelName(channel.source)}</p>
              <p className="admin-analytics-tile-value">
                {channel.action === "unknown"
                  ? "No spend yet"
                  : channel.action === "scale"
                    ? "Scale"
                    : channel.action === "cut"
                      ? "Cut back"
                      : "Hold"}
              </p>
              <p className="admin-analytics-tile-hint">{channel.reason}</p>
              <p className="mt-2 text-sm text-[var(--g-charcoal)]">
                Delivered {formatMoney(channel.deliveredRevenue)}
                {channel.roas != null ? ` · ${channel.roas.toFixed(2)}×` : ""}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <ProductGroup title="Performing — worth ads" rows={performing} />
      <ProductGroup title="Needs improvement — small tests only" rows={improve} />
      <ProductGroup title="Weak — do not put ads here" rows={weak} />
    </div>
  );
}

function ProductGroup({ title, rows }: { title: string; rows: CoachProductRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-[var(--g-charcoal)]">{title}</h3>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.slug}>
            <Card className="admin-analytics-panel space-y-3 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/admin/products/${row.id}`}
                    className="text-lg font-semibold text-[var(--g-charcoal)] underline-offset-2 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--g-taupe)]">{verdictLine(row)}</p>
                </div>
                <span className={cn("admin-analytics-health", `admin-analytics-health-${row.health}`)}>
                  {HEALTH_LABEL[row.health]}
                </span>
              </div>
              <p className="text-sm text-[var(--g-charcoal)]">{row.reason}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[var(--g-taupe)]">Listed</dt>
                  <dd className="tabular-nums">{formatMoney(row.listedPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Customers paid</dt>
                  <dd className="tabular-nums">{formatMoney(row.sellingPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Your cost</dt>
                  <dd className="tabular-nums">{formatMoney(row.costPrice)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Shipping in floor</dt>
                  <dd className="tabular-nums">{formatMoney(row.shippingAllocated)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Break-even ads</dt>
                  <dd className="tabular-nums">
                    {row.breakEvenRoas == null ? "Not available" : `${row.breakEvenRoas}× delivered`}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Suggested spend</dt>
                  <dd className="tabular-nums">{formatMoney(row.suggestedSpend)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--g-taupe)]">Finished orders</dt>
                  <dd className="tabular-nums">
                    {row.matureSample} older than 3 days
                    {row.thinSample ? " · too few to scale" : ""}
                  </dd>
                </div>
              </dl>
              {row.suggestedSpend > 0 ? (
                <ul className="text-sm text-[var(--g-charcoal)]">
                  {row.channelSplit.map((slice) => (
                    <li key={slice.source}>
                      {channelName(slice.source)}: {formatMoney(slice.amount)}
                      <span className="text-[var(--g-taupe)]"> — {slice.note}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
