import {
  addDaysYmd,
  buildExecutiveSnapshot,
  firstReachedAt,
  isoInRange,
  liveOrders,
  parseIso,
  type AnalyticsOrder,
  type ProductCostRow,
  type YmdRange,
} from "./analytics-rules";
import type { TrafficEvent, TrafficSession } from "./analytics-traffic-rules";

export type BundleOrderLike = AnalyticsOrder & {
  source?: string | null;
};

export type Per100 = {
  delivered: number;
  cancelled: number;
  waiting: number;
};

export type MoneyStory = {
  placedCount: number;
  keptCount: number;
  lostCount: number;
  waitingCount: number;
  booked: number;
  kept: number;
  lost: number;
  waiting: number;
  deliveredAov: number | null;
  per100: Per100;
  health: string;
  keptOrderIds: string[];
  lostOrderIds: string[];
  waitingOrderIds: string[];
};

export type PeriodDelta = {
  current: number | null;
  previous: number | null;
  pct: number | null;
};

export type PeriodComparison = {
  previousRange: YmdRange;
  deliveredRevenue: PeriodDelta;
  cancellationRate: PeriodDelta;
  ordersPlaced: PeriodDelta;
};

export type FulfillmentHours = {
  samples: number;
  placedToProcessing: number | null;
  processingToShipped: number | null;
  shippedToDelivered: number | null;
  placedToDelivered: number | null;
};

export type ProductConversionRow = {
  slug: string;
  name: string;
  views: number;
  addToCart: number;
  ordersPlaced: number;
  ordersDelivered: number;
  viewToCart: number | null;
  cartToOrder: number | null;
  viewToOrder: number | null;
};

export type SourceMoneyRow = {
  source: string;
  placedCount: number;
  deliveredCount: number;
  booked: number;
  deliveredRevenue: number;
  lost: number;
  waiting: number;
  spend: number;
  roas: number | null;
  orderIds: string[];
};

export type RtoProxy = {
  count: number;
  revenue: number;
  orderIds: string[];
  cancelledBeforeShip: number;
  shippedCount: number;
  disclaimer: string;
};

export type MissingCostRow = {
  slug: string;
  name: string;
  quantityDelivered: number;
};

export type CheckoutFieldRow = {
  field: string;
  count: number;
};

export type ProfitAlert = {
  id: string;
  title: string;
  body: string;
  severity: "watch" | "urgent";
};

export type AdSpendBySource = Record<string, number>;
export type AdSpendStore = {
  ranges: Record<string, AdSpendBySource>;
  packingFee: number;
  codFee: number;
};

export type CsvColumn<T> = { key: keyof T; header: string };

function money(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function rate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

function inclusiveDayCount(range: YmdRange): number {
  const [ys, ms, ds] = range.start.split("-").map(Number);
  const [ye, me, de] = range.end.split("-").map(Number);
  const start = Date.UTC(ys, (ms ?? 1) - 1, ds ?? 1);
  const end = Date.UTC(ye, (me ?? 1) - 1, de ?? 1);
  return Math.round((end - start) / 86_400_000) + 1;
}

export function priorYmdRange(range: YmdRange): YmdRange {
  const days = inclusiveDayCount(range);
  return {
    start: addDaysYmd(range.start, -days),
    end: addDaysYmd(range.start, -1),
  };
}

export function sourceKey(source: string | null | undefined): string {
  const trimmed = (source ?? "").trim();
  return trimmed || "unattributed";
}

function placedInRange(orders: AnalyticsOrder[], range: YmdRange): AnalyticsOrder[] {
  return liveOrders(orders).filter((o) => isoInRange(o.createdAt, range));
}

function currentStatus(order: AnalyticsOrder): string {
  return order.status ?? "new";
}

function per100(delivered: number, cancelled: number, waiting: number, total: number): Per100 {
  if (total <= 0) return { delivered: 0, cancelled: 0, waiting: 0 };
  const parts: { key: keyof Per100; val: number }[] = [
    { key: "delivered", val: (delivered / total) * 100 },
    { key: "cancelled", val: (cancelled / total) * 100 },
    { key: "waiting", val: (waiting / total) * 100 },
  ];
  const floors = parts.map((p) => ({
    key: p.key,
    floor: Math.floor(p.val),
    rem: p.val - Math.floor(p.val),
  }));
  const leftover = 100 - floors.reduce((s, p) => s + p.floor, 0);
  const tie = { waiting: 0, cancelled: 1, delivered: 2 };
  const ranked = floors.slice().sort((a, b) => b.rem - a.rem || tie[a.key] - tie[b.key]);
  const extra = new Set(ranked.slice(0, leftover).map((p) => p.key));
  return {
    delivered: floors[0].floor + (extra.has("delivered") ? 1 : 0),
    cancelled: floors[1].floor + (extra.has("cancelled") ? 1 : 0),
    waiting: floors[2].floor + (extra.has("waiting") ? 1 : 0),
  };
}

function healthPhrase(placed: number, cancelled: number, waiting: number, delivered: number): string {
  if (placed <= 0) return "No orders in this period";
  const cancelRate = cancelled / placed;
  if (cancelRate >= 0.25) return "Too many orders are dying";
  if (cancelRate >= 0.15) return "Cancels are eating profit";
  if (waiting / placed >= 0.4) return "Too much money is still on the road";
  if (delivered / placed >= 0.7) return "Delivery is holding";
  return "Still too many orders in limbo";
}

export function buildMoneyStory(orders: AnalyticsOrder[], range: YmdRange): MoneyStory {
  const placed = placedInRange(orders, range);
  const keptList = placed.filter((o) => currentStatus(o) === "delivered");
  const lostList = placed.filter((o) => currentStatus(o) === "cancelled");
  const waitingList = placed.filter((o) => {
    const status = currentStatus(o);
    return status !== "delivered" && status !== "cancelled";
  });
  const kept = keptList.reduce((s, o) => s + money(o.total), 0);
  return {
    placedCount: placed.length,
    keptCount: keptList.length,
    lostCount: lostList.length,
    waitingCount: waitingList.length,
    booked: placed.reduce((s, o) => s + money(o.total), 0),
    kept,
    lost: lostList.reduce((s, o) => s + money(o.total), 0),
    waiting: waitingList.reduce((s, o) => s + money(o.total), 0),
    deliveredAov: keptList.length ? kept / keptList.length : null,
    per100: per100(keptList.length, lostList.length, waitingList.length, placed.length),
    health: healthPhrase(placed.length, lostList.length, waitingList.length, keptList.length),
    keptOrderIds: keptList.map((o) => o.orderId),
    lostOrderIds: lostList.map((o) => o.orderId),
    waitingOrderIds: waitingList.map((o) => o.orderId),
  };
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

function delta(current: number | null, previous: number | null): PeriodDelta {
  return { current, previous, pct: pctChange(current, previous) };
}

export function buildPeriodComparison(orders: AnalyticsOrder[], range: YmdRange): PeriodComparison {
  const previousRange = priorYmdRange(range);
  const current = buildExecutiveSnapshot(orders, range);
  const previous = buildExecutiveSnapshot(orders, previousRange);
  return {
    previousRange,
    deliveredRevenue: delta(current.deliveredRevenue, previous.deliveredRevenue),
    cancellationRate: delta(current.cancellationRate, previous.cancellationRate),
    ordersPlaced: delta(current.ordersPlaced, previous.ordersPlaced),
  };
}

function hoursBetween(fromIso: string | null | undefined, toIso: string | null | undefined): number | null {
  const from = parseIso(fromIso);
  const to = parseIso(toIso);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return (to - from) / 3_600_000;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildFulfillmentHours(orders: AnalyticsOrder[], range: YmdRange): FulfillmentHours {
  const placed = placedInRange(orders, range);
  const toProcessing: number[] = [];
  const toShipped: number[] = [];
  const toDelivered: number[] = [];
  const placedToDelivered: number[] = [];
  for (const order of placed) {
    const processing = firstReachedAt(order, "processing");
    const shipped = firstReachedAt(order, "shipped");
    const delivered = firstReachedAt(order, "delivered");
    const p = hoursBetween(order.createdAt, processing);
    const s = hoursBetween(processing, shipped);
    const d = hoursBetween(shipped, delivered);
    const all = hoursBetween(order.createdAt, delivered);
    if (p != null) toProcessing.push(p);
    if (s != null) toShipped.push(s);
    if (d != null) toDelivered.push(d);
    if (all != null) placedToDelivered.push(all);
  }
  return {
    samples: placed.length,
    placedToProcessing: median(toProcessing),
    processingToShipped: median(toShipped),
    shippedToDelivered: median(toDelivered),
    placedToDelivered: median(placedToDelivered),
  };
}

function productSlugFromEvent(event: TrafficEvent): string {
  const direct = event.productSlug?.trim();
  if (direct) return direct;
  const path = typeof event.path === "string" ? event.path : "";
  const match = path.match(/\/product\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

function cohortIds(sessions: TrafficSession[], range: YmdRange): Set<string> {
  return new Set(
    sessions.filter((s) => s.isDemo === false && isoInRange(s.startedAt, range)).map((s) => s.id)
  );
}

export function buildProductConversion(
  orders: AnalyticsOrder[],
  sessions: TrafficSession[],
  events: TrafficEvent[],
  range: YmdRange
): ProductConversionRow[] {
  const ids = cohortIds(sessions, range);
  const rows = new Map<string, ProductConversionRow>();

  function row(slug: string, name?: string): ProductConversionRow {
    const key = slug || "unknown";
    let current = rows.get(key);
    if (!current) {
      current = {
        slug: key,
        name: name || key,
        views: 0,
        addToCart: 0,
        ordersPlaced: 0,
        ordersDelivered: 0,
        viewToCart: null,
        cartToOrder: null,
        viewToOrder: null,
      };
      rows.set(key, current);
    } else if (name && current.name === current.slug) {
      current.name = name;
    }
    return current;
  }

  for (const event of events) {
    if (!ids.has(event.sessionId)) continue;
    const slug = productSlugFromEvent(event);
    if (!slug) continue;
    if (event.name === "product_view") row(slug).views += 1;
    if (event.name === "add_to_cart") row(slug).addToCart += 1;
  }

  const placed = placedInRange(orders, range);
  for (const order of placed) {
    const seen = new Set<string>();
    for (const item of order.items ?? []) {
      const slug = item.slug?.trim() || "";
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const current = row(slug, item.name ?? undefined);
      current.ordersPlaced += 1;
      if (currentStatus(order) === "delivered") current.ordersDelivered += 1;
    }
  }

  return Array.from(rows.values())
    .map((r) => ({
      ...r,
      viewToCart: rate(r.addToCart, r.views),
      cartToOrder: rate(r.ordersPlaced, r.addToCart),
      viewToOrder: rate(r.ordersPlaced, r.views),
    }))
    .sort((a, b) => b.views - a.views || b.ordersPlaced - a.ordersPlaced);
}

export function computeRoas(deliveredRevenue: number, spend: number | null | undefined): number | null {
  if (spend == null || !(spend > 0)) return null;
  return deliveredRevenue / spend;
}

export function buildSourceMoney(
  orders: BundleOrderLike[],
  range: YmdRange,
  spend: AdSpendBySource = {}
): SourceMoneyRow[] {
  const placed = placedInRange(orders, range) as BundleOrderLike[];
  const delivered = liveOrders(orders).filter(
    (o) => currentStatus(o) !== "cancelled" && isoInRange(firstReachedAt(o, "delivered"), range)
  ) as BundleOrderLike[];

  const rows = new Map<string, SourceMoneyRow>();
  function row(source: string): SourceMoneyRow {
    let current = rows.get(source);
    if (!current) {
      current = {
        source,
        placedCount: 0,
        deliveredCount: 0,
        booked: 0,
        deliveredRevenue: 0,
        lost: 0,
        waiting: 0,
        spend: money(spend[source]),
        roas: null,
        orderIds: [],
      };
      rows.set(source, current);
    }
    return current;
  }

  for (const order of placed) {
    const current = row(sourceKey(order.source));
    current.placedCount += 1;
    current.booked += money(order.total);
    current.orderIds.push(order.orderId);
    const status = currentStatus(order);
    if (status === "cancelled") current.lost += money(order.total);
    else if (status !== "delivered") current.waiting += money(order.total);
  }

  for (const order of delivered) {
    const current = row(sourceKey(order.source));
    current.deliveredCount += 1;
    current.deliveredRevenue += money(order.total);
    if (!current.orderIds.includes(order.orderId)) current.orderIds.push(order.orderId);
  }

  for (const [source, amount] of Object.entries(spend)) {
    if (money(amount) > 0) row(sourceKey(source)).spend = money(amount);
  }

  return Array.from(rows.values())
    .map((r) => ({ ...r, roas: computeRoas(r.deliveredRevenue, r.spend) }))
    .sort((a, b) => b.deliveredRevenue - a.deliveredRevenue || b.booked - a.booked);
}

const RTO_DISCLAIMER =
  "Not courier-confirmed. These orders were shipped, then cancelled — often a return, refuse, or RTO.";

export function buildRtoProxy(orders: AnalyticsOrder[], range: YmdRange): RtoProxy {
  const placed = placedInRange(orders, range);
  const shipped = placed.filter((o) => firstReachedAt(o, "shipped") != null);
  const proxy = placed.filter((o) => {
    if (currentStatus(o) !== "cancelled") return false;
    const shippedAt = firstReachedAt(o, "shipped");
    const cancelledAt = firstReachedAt(o, "cancelled");
    if (!shippedAt) return false;
    const shippedTime = parseIso(shippedAt);
    const cancelledTime = parseIso(cancelledAt);
    if (Number.isNaN(shippedTime)) return false;
    if (Number.isNaN(cancelledTime)) return true;
    return shippedTime < cancelledTime;
  });
  const beforeShip = placed.filter(
    (o) => currentStatus(o) === "cancelled" && firstReachedAt(o, "shipped") == null
  );
  return {
    count: proxy.length,
    revenue: proxy.reduce((s, o) => s + money(o.total), 0),
    orderIds: proxy.map((o) => o.orderId),
    cancelledBeforeShip: beforeShip.length,
    shippedCount: shipped.length,
    disclaimer: RTO_DISCLAIMER,
  };
}

export function buildMissingCosts(
  orders: AnalyticsOrder[],
  range: YmdRange,
  costs: ProductCostRow[]
): MissingCostRow[] {
  const delivered = liveOrders(orders).filter(
    (o) => currentStatus(o) !== "cancelled" && isoInRange(firstReachedAt(o, "delivered"), range)
  );
  const costBySlug = new Map(
    costs.map((c) => [c.slug, c.costPrice != null && Number.isFinite(c.costPrice) ? Number(c.costPrice) : null])
  );
  const rows = new Map<string, MissingCostRow>();
  for (const order of delivered) {
    for (const item of order.items ?? []) {
      const slug = item.slug?.trim() || "";
      if (!slug) continue;
      const cost = costBySlug.get(slug);
      if (cost != null) continue;
      const current = rows.get(slug) ?? {
        slug,
        name: item.name?.trim() || slug,
        quantityDelivered: 0,
      };
      current.quantityDelivered += Number(item.quantity ?? 1) || 1;
      rows.set(slug, current);
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.quantityDelivered - a.quantityDelivered);
}

export function buildCheckoutFieldFailures(
  sessions: TrafficSession[],
  events: TrafficEvent[],
  range: YmdRange
): CheckoutFieldRow[] {
  const ids = cohortIds(sessions, range);
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.name !== "checkout_validation_error" || !ids.has(event.sessionId)) continue;
    const field = typeof event.properties?.category === "string" ? event.properties.category.trim() : "";
    if (!field) continue;
    counts.set(field, (counts.get(field) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));
}

export function buildProfitAlerts(input: {
  moneyStory: MoneyStory;
  comparison: PeriodComparison;
  missingCosts: MissingCostRow[];
  rto: RtoProxy;
  checkoutFields: CheckoutFieldRow[];
}): ProfitAlert[] {
  const alerts: ProfitAlert[] = [];
  const story = input.moneyStory;
  const cancelRate = rate(story.lostCount, story.placedCount);
  if (story.placedCount >= 3 && cancelRate != null && cancelRate >= 0.2) {
    alerts.push({
      id: "high_cancel",
      severity: "urgent",
      title: "Too many orders are cancelling",
      body: `Of ${story.placedCount} orders you took, ${story.lostCount} already cancelled. Call before dispatch, especially weak cities.`,
    });
  }
  if (story.waiting > story.kept && story.waitingCount > 0) {
    alerts.push({
      id: "money_waiting",
      severity: "watch",
      title: "More money is waiting than already in hand",
      body: "Speed packing and courier handoff. Waiting orders can still cancel.",
    });
  }
  if (input.missingCosts.length > 0) {
    alerts.push({
      id: "missing_costs",
      severity: "watch",
      title: "Profit is incomplete",
      body: `Fill cost price on ${input.missingCosts.length} product${input.missingCosts.length === 1 ? "" : "s"} so delivered profit is a real number.`,
    });
  }
  const down = input.comparison.deliveredRevenue.pct;
  if (down != null && down <= -0.15) {
    alerts.push({
      id: "revenue_down",
      severity: "urgent",
      title: "Delivered money is down versus last period",
      body: "Same-length previous window made more delivered revenue. Check ads, stock, and cancel rate.",
    });
  }
  const rtoRate = rate(input.rto.count, input.rto.shippedCount);
  if (input.rto.count >= 1 && rtoRate != null && rtoRate >= 0.1) {
    alerts.push({
      id: "rto_watch",
      severity: "watch",
      title: "Shipped orders are coming back as cancels",
      body: `${input.rto.count} shipped-then-cancelled order${input.rto.count === 1 ? "" : "s"}. Confirm address and phone before handing to courier.`,
    });
  }
  const topField = input.checkoutFields[0];
  if (topField && topField.count >= 5) {
    alerts.push({
      id: "checkout_friction",
      severity: "watch",
      title: `Checkout is blocking on ${topField.field}`,
      body: `${topField.count} failed attempts on that field. Fix the form hint so more carts become orders.`,
    });
  }
  return alerts;
}

export function adSpendRangeKey(range: YmdRange): string {
  return `${range.start}|${range.end}`;
}

function canonicalSpendSource(source: string): string {
  const key = sourceKey(source).toLowerCase();
  if (key === "facebook" || key === "instagram") return "meta";
  return sourceKey(source);
}

function cleanSpendMap(raw: unknown): AdSpendBySource {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: AdSpendBySource = {};
  for (const [source, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = canonicalSpendSource(source);
    const amount = typeof value === "number" ? value : Number(value);
    if (key && Number.isFinite(amount) && amount > 0) out[key] = (out[key] ?? 0) + amount;
  }
  return out;
}

function extraFee(raw: Record<string, unknown> | null, key: string): number {
  if (!raw) return 0;
  const amount = Number(raw[key]);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

export function parseAdSpendStore(raw: unknown): AdSpendStore {
  const ranges: Record<string, AdSpendBySource> = {};
  const extras = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const bag = extras && "ranges" in extras ? extras.ranges : raw;
  const packingFee = extraFee(extras, "packingFee");
  const codFee = extraFee(extras, "codFee");
  if (!bag || typeof bag !== "object" || Array.isArray(bag)) {
    return { ranges, packingFee, codFee };
  }
  for (const [key, value] of Object.entries(bag as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    ranges[key] = cleanSpendMap(value);
  }
  return { ranges, packingFee, codFee };
}

export function spendForRange(store: AdSpendStore, range: YmdRange): AdSpendBySource {
  return { ...(store.ranges[adSpendRangeKey(range)] ?? {}) };
}

export function upsertAdSpend(store: AdSpendStore | Record<string, never>, range: YmdRange, bySource: AdSpendBySource): AdSpendStore {
  const key = adSpendRangeKey(range);
  const next = { ...(store.ranges ?? {}), [key]: cleanSpendMap(bySource) };
  if (Object.keys(next[key]).length === 0) delete next[key];
  const current = parseAdSpendStore(store);
  return { ranges: next, packingFee: current.packingFee, codFee: current.codFee };
}

export function upsertUnitFees(
  store: AdSpendStore | Record<string, never>,
  fees: { packingFee?: number; codFee?: number }
): AdSpendStore {
  const current = parseAdSpendStore(store);
  return {
    ranges: current.ranges,
    packingFee:
      fees.packingFee != null && Number.isFinite(fees.packingFee) && fees.packingFee >= 0
        ? fees.packingFee
        : current.packingFee,
    codFee:
      fees.codFee != null && Number.isFinite(fees.codFee) && fees.codFee >= 0 ? fees.codFee : current.codFee,
  };
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(","));
  return [header, ...body].join("\n");
}

export type ProfitLayer = {
  moneyStory: MoneyStory;
  comparison: PeriodComparison;
  fulfillmentHours: FulfillmentHours;
  productConversion: ProductConversionRow[];
  sourceMoney: SourceMoneyRow[];
  rto: RtoProxy;
  missingCosts: MissingCostRow[];
  checkoutFields: CheckoutFieldRow[];
  alerts: ProfitAlert[];
};

export function buildProfitLayer(input: {
  orders: BundleOrderLike[];
  range: YmdRange;
  costs?: ProductCostRow[];
  sessions: TrafficSession[];
  events: TrafficEvent[];
  spend?: AdSpendBySource;
}): ProfitLayer {
  const costs = input.costs ?? [];
  const moneyStory = buildMoneyStory(input.orders, input.range);
  const comparison = buildPeriodComparison(input.orders, input.range);
  const rto = buildRtoProxy(input.orders, input.range);
  const missingCosts = buildMissingCosts(input.orders, input.range, costs);
  const checkoutFields = buildCheckoutFieldFailures(input.sessions, input.events, input.range);
  return {
    moneyStory,
    comparison,
    fulfillmentHours: buildFulfillmentHours(input.orders, input.range),
    productConversion: buildProductConversion(input.orders, input.sessions, input.events, input.range),
    sourceMoney: buildSourceMoney(input.orders, input.range, input.spend),
    rto,
    missingCosts,
    checkoutFields,
    alerts: buildProfitAlerts({ moneyStory, comparison, missingCosts, rto, checkoutFields }),
  };
}
