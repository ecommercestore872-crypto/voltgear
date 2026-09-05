export const ANALYTICS_TIMEZONE = "Asia/Karachi";

export const ANALYTICS_PRESETS = ["today", "yesterday", "last7", "last30", "thisMonth", "custom"] as const;
export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number];

export const ANALYTICS_METRICS = [
  "deliveredRevenue",
  "deliveredProfit",
  "ordersPlaced",
  "ordersDelivered",
  "deliveryRate",
  "cancellationRate",
  "averageOrderValue",
] as const;
export type AnalyticsMetric = (typeof ANALYTICS_METRICS)[number];

export const ANALYTICS_DIMENSIONS = [
  "product",
  "category",
  "city",
  "date",
  "customerCohort",
  "source",
] as const;
export type AnalyticsDimension = (typeof ANALYTICS_DIMENSIONS)[number];

export type YmdRange = { start: string; end: string };

export type AnalyticsHistoryEntry = { status?: string | null; at?: string | null };

export type AnalyticsItem = {
  slug?: string | null;
  name?: string | null;
  price?: number | null;
  quantity?: number | null;
  lineTotal?: number | null;
  variantName?: string | null;
};

export type AnalyticsOrder = {
  orderId: string;
  createdAt: string;
  status?: string | null;
  statusUpdatedAt?: string | null;
  statusHistory?: AnalyticsHistoryEntry[] | null;
  total?: number | null;
  isDemo?: boolean;
  customer?: { email?: string | null; phone?: string | null; city?: string | null } | null;
  items?: AnalyticsItem[] | null;
  source?: string | null;
  shipping?: number | null;
  subtotal?: number | null;
  payment?: string | null;
  discount?: number | null;
};

export type ProductCostRow = {
  slug: string;
  name?: string;
  category?: string;
  costPrice?: number | null;
};

export type UnavailableKey =
  | "confirmed"
  | "outForDelivery"
  | "returned"
  | "visitors"
  | "marketing"
  | "contributionProfit";

export function karachiYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ANALYTICS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days, 12));
  return dt.toISOString().slice(0, 10);
}

export function resolveAnalyticsRange(
  preset: AnalyticsPreset,
  now = new Date(),
  custom?: { from?: string; to?: string }
): YmdRange {
  const today = karachiYmd(now);
  if (preset === "today") return { start: today, end: today };
  if (preset === "yesterday") {
    const y = addDaysYmd(today, -1);
    return { start: y, end: y };
  }
  if (preset === "last7") return { start: addDaysYmd(today, -6), end: today };
  if (preset === "last30") return { start: addDaysYmd(today, -29), end: today };
  if (preset === "thisMonth") return { start: `${today.slice(0, 7)}-01`, end: today };
  const from = custom?.from?.trim() || today;
  const to = custom?.to?.trim() || today;
  return from <= to ? { start: from, end: to } : { start: to, end: from };
}

export function parseIso(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const t = Date.parse(iso);
  if (!Number.isNaN(t)) return t;
  return Date.parse(iso.replace(/(\.\d{3})\d+/, "$1"));
}

export function isoInRange(iso: string | null | undefined, range: YmdRange): boolean {
  const t = parseIso(iso);
  if (Number.isNaN(t)) return false;
  const y = karachiYmd(new Date(t));
  return y >= range.start && y <= range.end;
}

export function firstReachedAt(order: AnalyticsOrder, status: string): string | null {
  const hits = (order.statusHistory ?? []).filter(
    (h) => (h.status ?? "") === status && h.at && !Number.isNaN(parseIso(h.at))
  );
  if (hits.length) {
    return hits.slice().sort((a, b) => parseIso(a.at) - parseIso(b.at))[0].at!;
  }
  if ((order.status ?? "new") === status) {
    if (status === "new") return order.createdAt;
    return order.statusUpdatedAt ?? null;
  }
  if (status === "new") return order.createdAt;
  return null;
}

export function normalizeCity(city: string | null | undefined): string {
  return (city ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function displayCity(city: string | null | undefined): string {
  const raw = (city ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "Unknown";
  return raw
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function lineAmount(item: AnalyticsItem): number {
  if (typeof item.lineTotal === "number" && Number.isFinite(item.lineTotal)) return item.lineTotal;
  const q = Number(item.quantity ?? 1);
  const p = Number(item.price ?? 0);
  return (Number.isFinite(q) ? q : 1) * (Number.isFinite(p) ? p : 0);
}

export function liveOrders(orders: AnalyticsOrder[]): AnalyticsOrder[] {
  return orders.filter((o) => !o.isDemo);
}

function money(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function rate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

export type DrillOrder = {
  orderId: string;
  createdAt: string;
  status: string;
  total: number;
  city: string;
};

function toDrill(o: AnalyticsOrder): DrillOrder {
  return {
    orderId: o.orderId,
    createdAt: o.createdAt,
    status: o.status ?? "new",
    total: money(o.total),
    city: displayCity(o.customer?.city),
  };
}

export type ExecutiveSnapshot = {
  range: YmdRange;
  ordersPlaced: number;
  ordersProcessing: number;
  ordersShipped: number;
  ordersDelivered: number;
  ordersCancelled: number;
  placedRevenue: number;
  deliveredRevenue: number;
  deliverySuccessRate: number | null;
  cancellationRate: number | null;
  deliveredGrossProfit: number | null;
  profitIncomplete: boolean;
  placedOrderIds: string[];
  deliveredOrderIds: string[];
  cancelledOrderIds: string[];
  unavailable: Record<UnavailableKey, "Not available">;
};

export function buildExecutiveSnapshot(
  orders: AnalyticsOrder[],
  range: YmdRange,
  costs: ProductCostRow[] = []
): ExecutiveSnapshot {
  const live = liveOrders(orders);
  const placed = live.filter((o) => isoInRange(o.createdAt, range));
  const processing = live.filter((o) => isoInRange(firstReachedAt(o, "processing"), range));
  const shipped = live.filter((o) => isoInRange(firstReachedAt(o, "shipped"), range));
  const delivered = live.filter(
    (o) => o.status !== "cancelled" && isoInRange(firstReachedAt(o, "delivered"), range)
  );
  const cancelled = live.filter((o) => isoInRange(firstReachedAt(o, "cancelled"), range));
  const currentlyDeliveredOfPlaced = placed.filter((o) => (o.status ?? "new") === "delivered");
  const currentlyCancelledOfPlaced = placed.filter((o) => o.status === "cancelled");
  const deliveredRevenue = delivered.reduce((s, o) => s + money(o.total), 0);
  const cogs = deliveredCogs(delivered, costs);
  return {
    range,
    ordersPlaced: placed.length,
    ordersProcessing: processing.length,
    ordersShipped: shipped.length,
    ordersDelivered: delivered.length,
    ordersCancelled: cancelled.length,
    placedRevenue: placed.reduce((s, o) => s + money(o.total), 0),
    deliveredRevenue,
    deliverySuccessRate: rate(currentlyDeliveredOfPlaced.length, placed.length),
    cancellationRate: rate(currentlyCancelledOfPlaced.length, placed.length),
    deliveredGrossProfit: cogs.complete ? deliveredRevenue - cogs.amount : null,
    profitIncomplete: delivered.length > 0 && !cogs.complete,
    placedOrderIds: placed.map((o) => o.orderId),
    deliveredOrderIds: delivered.map((o) => o.orderId),
    cancelledOrderIds: cancelled.map((o) => o.orderId),
    unavailable: {
      confirmed: "Not available",
      outForDelivery: "Not available",
      returned: "Not available",
      visitors: "Not available",
      marketing: "Not available",
      contributionProfit: "Not available",
    },
  };
}

function costMap(costs: ProductCostRow[]): Map<string, number | null> {
  const m = new Map<string, number | null>();
  for (const c of costs) {
    const slug = c.slug?.trim();
    if (!slug) continue;
    m.set(slug, c.costPrice != null && Number.isFinite(c.costPrice) ? Number(c.costPrice) : null);
  }
  return m;
}

function deliveredCogs(delivered: AnalyticsOrder[], costs: ProductCostRow[]): { amount: number; complete: boolean } {
  const map = costMap(costs);
  let amount = 0;
  let complete = true;
  if (delivered.length === 0) return { amount: 0, complete: true };
  for (const o of delivered) {
    for (const item of o.items ?? []) {
      const slug = item.slug?.trim() ?? "";
      const qty = Number(item.quantity ?? 1) || 1;
      const cost = map.get(slug);
      if (cost == null) complete = false;
      else amount += cost * qty;
    }
  }
  return { amount, complete };
}

export type ProductPerfRow = {
  slug: string;
  name: string;
  category: string;
  quantityOrdered: number;
  quantityDelivered: number;
  placedRevenue: number;
  deliveredRevenue: number;
  costOfGoods: number | null;
  deliveredGrossProfit: number | null;
  cancellationRate: number | null;
  deliverySuccessRate: number | null;
  orderIds: string[];
};

export function buildProductPerformance(
  orders: AnalyticsOrder[],
  range: YmdRange,
  costs: ProductCostRow[] = []
): ProductPerfRow[] {
  const live = liveOrders(orders);
  const placed = live.filter((o) => isoInRange(o.createdAt, range));
  const delivered = live.filter(
    (o) => o.status !== "cancelled" && isoInRange(firstReachedAt(o, "delivered"), range)
  );
  const costBySlug = new Map(costs.map((c) => [c.slug, c]));
  const rows = new Map<string, ProductPerfRow & { placedOrderIds: Set<string>; deliveredOrderIds: Set<string> }>();

  function row(slug: string, name: string): ProductPerfRow & { placedOrderIds: Set<string>; deliveredOrderIds: Set<string> } {
    const key = slug || name || "unknown";
    let r = rows.get(key);
    if (!r) {
      const meta = costBySlug.get(slug);
      r = {
        slug: key,
        name: name || meta?.name || key,
        category: meta?.category ?? "",
        quantityOrdered: 0,
        quantityDelivered: 0,
        placedRevenue: 0,
        deliveredRevenue: 0,
        costOfGoods: 0,
        deliveredGrossProfit: 0,
        cancellationRate: null,
        deliverySuccessRate: null,
        orderIds: [],
        placedOrderIds: new Set(),
        deliveredOrderIds: new Set(),
      };
      rows.set(key, r);
    }
    return r;
  }

  for (const o of placed) {
    for (const item of o.items ?? []) {
      const r = row(item.slug?.trim() ?? "", item.name ?? "");
      r.quantityOrdered += Number(item.quantity ?? 1) || 1;
      r.placedRevenue += lineAmount(item);
      r.placedOrderIds.add(o.orderId);
    }
  }
  for (const o of delivered) {
    for (const item of o.items ?? []) {
      const r = row(item.slug?.trim() ?? "", item.name ?? "");
      const qty = Number(item.quantity ?? 1) || 1;
      r.quantityDelivered += qty;
      r.deliveredRevenue += lineAmount(item);
      r.deliveredOrderIds.add(o.orderId);
      const cost = costBySlug.get(r.slug)?.costPrice;
      if (cost != null && Number.isFinite(cost)) r.costOfGoods = (r.costOfGoods ?? 0) + cost * qty;
    }
  }

  const out: ProductPerfRow[] = [];
  Array.from(rows.values()).forEach((r) => {
    const set = placed.filter((o) => r.placedOrderIds.has(o.orderId));
    const den = set.length;
    const deliveredNow = set.filter((o) => (o.status ?? "") === "delivered").length;
    const cancelledNow = set.filter((o) => o.status === "cancelled").length;
    const hasCost = costs.some((c) => c.slug === r.slug && c.costPrice != null && Number.isFinite(c.costPrice));
    const cogs = hasCost ? r.costOfGoods : null;
    const idSet = new Set<string>(Array.from(r.placedOrderIds).concat(Array.from(r.deliveredOrderIds)));
    out.push({
      slug: r.slug,
      name: r.name,
      category: r.category,
      quantityOrdered: r.quantityOrdered,
      quantityDelivered: r.quantityDelivered,
      placedRevenue: r.placedRevenue,
      deliveredRevenue: r.deliveredRevenue,
      costOfGoods: cogs,
      deliveredGrossProfit: cogs == null ? null : r.deliveredRevenue - cogs,
      cancellationRate: rate(cancelledNow, den),
      deliverySuccessRate: rate(deliveredNow, den),
      orderIds: Array.from(idSet),
    });
  });
  out.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue || b.placedRevenue - a.placedRevenue);
  return out;
}

export type CityPerfRow = {
  city: string;
  ordersPlaced: number;
  ordersProcessing: number;
  ordersDelivered: number;
  ordersCancelled: number;
  deliveredRevenue: number;
  deliverySuccessRate: number | null;
  cancellationRate: number | null;
  orderIds: string[];
};

export function buildCityPerformance(orders: AnalyticsOrder[], range: YmdRange): CityPerfRow[] {
  const live = liveOrders(orders);
  const placed = live.filter((o) => isoInRange(o.createdAt, range));
  const groups = new Map<string, AnalyticsOrder[]>();
  for (const o of placed) {
    const key = normalizeCity(o.customer?.city) || "unknown";
    const list = groups.get(key) ?? [];
    list.push(o);
    groups.set(key, list);
  }
  const rows: CityPerfRow[] = [];
  Array.from(groups.values()).forEach((list) => {
    const deliveredNow = list.filter((o) => (o.status ?? "") === "delivered");
    const cancelledNow = list.filter((o) => o.status === "cancelled");
    const processingNow = list.filter((o) => (o.status ?? "") === "processing");
    const deliveredInRange = live.filter(
      (o) =>
        o.status !== "cancelled" &&
        normalizeCity(o.customer?.city) === (normalizeCity(list[0]?.customer?.city) || "unknown") &&
        isoInRange(firstReachedAt(o, "delivered"), range)
    );
    rows.push({
      city: displayCity(list[0]?.customer?.city),
      ordersPlaced: list.length,
      ordersProcessing: processingNow.length,
      ordersDelivered: deliveredNow.length,
      ordersCancelled: cancelledNow.length,
      deliveredRevenue: deliveredInRange.reduce((s, o) => s + money(o.total), 0),
      deliverySuccessRate: rate(deliveredNow.length, list.length),
      cancellationRate: rate(cancelledNow.length, list.length),
      orderIds: list.map((o) => o.orderId),
    });
  });
  rows.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue || b.ordersPlaced - a.ordersPlaced);
  return rows;
}

export type FunnelStep = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
  orderIds: string[];
};

export function buildOrderFunnel(orders: AnalyticsOrder[], range: YmdRange): FunnelStep[] {
  const placed = liveOrders(orders).filter((o) => isoInRange(o.createdAt, range));
  const stages: { key: string; label: string; status: string | "placed" }[] = [
    { key: "placed", label: "Placed", status: "placed" },
    { key: "processing", label: "Processing", status: "processing" },
    { key: "shipped", label: "Shipped", status: "shipped" },
    { key: "delivered", label: "Delivered", status: "delivered" },
  ];
  const steps: FunnelStep[] = [];
  let prev = 0;
  for (const stage of stages) {
    const match =
      stage.status === "placed"
        ? placed
        : placed.filter((o) => firstReachedAt(o, stage.status) != null);
    const conversionFromPrevious = steps.length === 0 ? 1 : rate(match.length, prev);
    steps.push({
      key: stage.key,
      label: stage.label,
      count: match.length,
      conversionFromPrevious,
      orderIds: match.map((o) => o.orderId),
    });
    prev = match.length;
  }
  return steps;
}

export type CustomerRow = {
  cohort: "first-time" | "repeat";
  customers: number;
  orderCount: number;
  deliveredOrderCount: number;
  deliveredRevenue: number;
};

export type CustomerAnalytics = {
  firstTime: CustomerRow;
  repeat: CustomerRow;
  reorderRate30: number | null;
  reorderRate60: number | null;
  reorderRate90: number | null;
  skippedNoEmail: number;
};

function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

function customerKey(order: AnalyticsOrder): string | null {
  const email = order.customer?.email?.trim() ?? "";
  if (email) return `e:${email.toLowerCase()}`;
  const phone = phoneDigits(order.customer?.phone);
  if (phone) return `p:${phone}`;
  return null;
}

export function buildCustomerAnalytics(
  orders: AnalyticsOrder[],
  range: YmdRange,
  now = new Date()
): CustomerAnalytics {
  const live = liveOrders(orders);
  const skippedNoEmail = live.filter((o) => !customerKey(o)).length;
  const byCustomer = new Map<string, AnalyticsOrder[]>();
  for (const o of live) {
    const key = customerKey(o);
    if (!key) continue;
    const list = byCustomer.get(key) ?? [];
    list.push(o);
    byCustomer.set(key, list);
  }

  const asOf = karachiYmd(now);
  function deliveredAt(o: AnalyticsOrder): string | null {
    return firstReachedAt(o, "delivered");
  }

  let firstCustomers = 0;
  let repeatCustomers = 0;
  let firstOrders = 0;
  let repeatOrders = 0;
  let firstDelivered = 0;
  let repeatDelivered = 0;
  let firstRev = 0;
  let repeatRev = 0;
  let eligible30 = 0;
  let reordered30 = 0;
  let eligible60 = 0;
  let reordered60 = 0;
  let eligible90 = 0;
  let reordered90 = 0;

  Array.from(byCustomer.values()).forEach((list) => {
    const lifetimeDelivered = list
      .filter((o) => deliveredAt(o))
      .sort((a, b) => parseIso(deliveredAt(a)!) - parseIso(deliveredAt(b)!));
    const isRepeat = lifetimeDelivered.length >= 2;
    const inRange = list.filter((o) => isoInRange(o.createdAt, range));
    const deliveredInRange = list.filter(
      (o) => o.status !== "cancelled" && isoInRange(deliveredAt(o), range)
    );
    if (isRepeat) {
      repeatCustomers += 1;
      repeatOrders += inRange.length;
      repeatDelivered += deliveredInRange.length;
      repeatRev += deliveredInRange.reduce((s, o) => s + money(o.total), 0);
    } else {
      firstCustomers += 1;
      firstOrders += inRange.length;
      firstDelivered += deliveredInRange.length;
      firstRev += deliveredInRange.reduce((s, o) => s + money(o.total), 0);
    }
    if (lifetimeDelivered.length >= 1) {
      const first = deliveredAt(lifetimeDelivered[0])!;
      const firstYmd = karachiYmd(new Date(parseIso(first)));
      const second = lifetimeDelivered[1] ? deliveredAt(lifetimeDelivered[1]) : null;
      const gapDays = second
        ? Math.round((parseIso(second) - parseIso(first)) / 86400000)
        : null;
      if (addDaysYmd(firstYmd, 30) <= asOf) {
        eligible30 += 1;
        if (gapDays != null && gapDays <= 30) reordered30 += 1;
      }
      if (addDaysYmd(firstYmd, 60) <= asOf) {
        eligible60 += 1;
        if (gapDays != null && gapDays <= 60) reordered60 += 1;
      }
      if (addDaysYmd(firstYmd, 90) <= asOf) {
        eligible90 += 1;
        if (gapDays != null && gapDays <= 90) reordered90 += 1;
      }
    }
  });

  return {
    firstTime: {
      cohort: "first-time",
      customers: firstCustomers,
      orderCount: firstOrders,
      deliveredOrderCount: firstDelivered,
      deliveredRevenue: firstRev,
    },
    repeat: {
      cohort: "repeat",
      customers: repeatCustomers,
      orderCount: repeatOrders,
      deliveredOrderCount: repeatDelivered,
      deliveredRevenue: repeatRev,
    },
    reorderRate30: rate(reordered30, eligible30),
    reorderRate60: rate(reordered60, eligible60),
    reorderRate90: rate(reordered90, eligible90),
    skippedNoEmail,
  };
}

export type AnalyticsQuery = {
  metric: AnalyticsMetric;
  dimension?: AnalyticsDimension;
  preset: AnalyticsPreset;
  from?: string;
  to?: string;
  sort?: "asc" | "desc";
  limit?: number;
};

export function parseAnalyticsQuery(input: unknown): { ok: true; query: AnalyticsQuery } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Choose a metric and date range." };
  const raw = input as Record<string, unknown>;
  const metric = String(raw.metric ?? "");
  if (!ANALYTICS_METRICS.includes(metric as AnalyticsMetric)) {
    return { ok: false, error: "That metric is not allowed." };
  }
  const dimension = raw.dimension ? String(raw.dimension) : undefined;
  if (dimension && !ANALYTICS_DIMENSIONS.includes(dimension as AnalyticsDimension)) {
    return { ok: false, error: "That group-by is not allowed." };
  }
  if (typeof metric === "string" && /[;'"\\]/.test(metric)) {
    return { ok: false, error: "That metric is not allowed." };
  }
  const presetRaw = String(raw.preset ?? "last30");
  const preset = ANALYTICS_PRESETS.includes(presetRaw as AnalyticsPreset)
    ? (presetRaw as AnalyticsPreset)
    : "last30";
  const limit = Math.min(100, Math.max(1, Number(raw.limit ?? 25) || 25));
  const sort = raw.sort === "asc" ? "asc" : "desc";
  return {
    ok: true,
    query: {
      metric: metric as AnalyticsMetric,
      dimension: dimension as AnalyticsDimension | undefined,
      preset,
      from: raw.from ? String(raw.from) : undefined,
      to: raw.to ? String(raw.to) : undefined,
      sort,
      limit,
    },
  };
}

export type QueryRow = { label: string; value: number | null; orderIds: string[] };

export function runAnalyticsQuery(
  query: AnalyticsQuery,
  orders: AnalyticsOrder[],
  costs: ProductCostRow[],
  now = new Date()
): QueryRow[] {
  const range = resolveAnalyticsRange(query.preset, now, { from: query.from, to: query.to });
  const exec = buildExecutiveSnapshot(orders, range, costs);
  const products = buildProductPerformance(orders, range, costs);
  const cities = buildCityPerformance(orders, range);
  const customers = buildCustomerAnalytics(orders, range, now);

  let rows: QueryRow[] = [];
  const dim = query.dimension;
  if (!dim) {
    const value = pickMetric(query.metric, {
      deliveredRevenue: exec.deliveredRevenue,
      deliveredProfit: exec.deliveredGrossProfit,
      ordersPlaced: exec.ordersPlaced,
      ordersDelivered: exec.ordersDelivered,
      deliveryRate: exec.deliverySuccessRate,
      cancellationRate: exec.cancellationRate,
      averageOrderValue: exec.ordersDelivered ? exec.deliveredRevenue / exec.ordersDelivered : null,
    });
    const ids =
      query.metric === "ordersPlaced" || query.metric === "cancellationRate"
        ? exec.placedOrderIds
        : exec.deliveredOrderIds;
    rows = [{ label: "All", value, orderIds: ids }];
  } else if (dim === "product") {
    rows = products.map((p) => ({
      label: p.name,
      value: pickMetric(query.metric, {
        deliveredRevenue: p.deliveredRevenue,
        deliveredProfit: p.deliveredGrossProfit,
        ordersPlaced: p.orderIds.length,
        ordersDelivered: p.quantityDelivered,
        deliveryRate: p.deliverySuccessRate,
        cancellationRate: p.cancellationRate,
        averageOrderValue: null,
      }),
      orderIds: p.orderIds,
    }));
  } else if (dim === "category") {
    const byCat = new Map<string, ProductPerfRow[]>();
    for (const p of products) {
      const k = p.category || "uncategorized";
      const list = byCat.get(k) ?? [];
      list.push(p);
      byCat.set(k, list);
    }
    rows = Array.from(byCat.entries()).map(([label, list]) => ({
      label,
      value: list.reduce((s, p) => s + (p.deliveredRevenue || 0), 0),
      orderIds: Array.from(new Set(list.flatMap((p) => p.orderIds))),
    }));
  } else if (dim === "city") {
    rows = cities.map((c) => ({
      label: c.city,
      value: pickMetric(query.metric, {
        deliveredRevenue: c.deliveredRevenue,
        deliveredProfit: null,
        ordersPlaced: c.ordersPlaced,
        ordersDelivered: c.ordersDelivered,
        deliveryRate: c.deliverySuccessRate,
        cancellationRate: c.cancellationRate,
        averageOrderValue: c.ordersDelivered ? c.deliveredRevenue / c.ordersDelivered : null,
      }),
      orderIds: c.orderIds,
    }));
  } else if (dim === "date") {
    const live = liveOrders(orders);
    const days: string[] = [];
    for (let y = range.start; y <= range.end; y = addDaysYmd(y, 1)) days.push(y);
    rows = days.map((day) => {
      const dayRange = { start: day, end: day };
      const snap = buildExecutiveSnapshot(live, dayRange, costs);
      return {
        label: day,
        value: pickMetric(query.metric, {
          deliveredRevenue: snap.deliveredRevenue,
          deliveredProfit: snap.deliveredGrossProfit,
          ordersPlaced: snap.ordersPlaced,
          ordersDelivered: snap.ordersDelivered,
          deliveryRate: snap.deliverySuccessRate,
          cancellationRate: snap.cancellationRate,
          averageOrderValue: snap.ordersDelivered ? snap.deliveredRevenue / snap.ordersDelivered : null,
        }),
        orderIds: query.metric === "ordersPlaced" ? snap.placedOrderIds : snap.deliveredOrderIds,
      };
    });
  } else if (dim === "customerCohort") {
    rows = [
      {
        label: "First-time",
        value: customers.firstTime.deliveredRevenue,
        orderIds: [],
      },
      {
        label: "Repeat",
        value: customers.repeat.deliveredRevenue,
        orderIds: [],
      },
    ];
  } else if (dim === "source") {
    const live = liveOrders(orders);
    const keys = new Set(live.map((o) => ((o.source ?? "").trim() || "unattributed")));
    rows = Array.from(keys).map((label) => {
      const subset = live.filter((o) => ((o.source ?? "").trim() || "unattributed") === label);
      const snap = buildExecutiveSnapshot(subset, range, costs);
      return {
        label,
        value: pickMetric(query.metric, {
          deliveredRevenue: snap.deliveredRevenue,
          deliveredProfit: snap.deliveredGrossProfit,
          ordersPlaced: snap.ordersPlaced,
          ordersDelivered: snap.ordersDelivered,
          deliveryRate: snap.deliverySuccessRate,
          cancellationRate: snap.cancellationRate,
          averageOrderValue: snap.ordersDelivered ? snap.deliveredRevenue / snap.ordersDelivered : null,
        }),
        orderIds:
          query.metric === "ordersPlaced" || query.metric === "cancellationRate"
            ? snap.placedOrderIds
            : snap.deliveredOrderIds,
      };
    });
  }

  rows.sort((a, b) => {
    const av = a.value ?? -Infinity;
    const bv = b.value ?? -Infinity;
    return query.sort === "asc" ? av - bv : bv - av;
  });
  return rows.slice(0, query.limit ?? 25);
}

function pickMetric(
  metric: AnalyticsMetric,
  bag: {
    deliveredRevenue: number | null;
    deliveredProfit: number | null;
    ordersPlaced: number | null;
    ordersDelivered: number | null;
    deliveryRate: number | null;
    cancellationRate: number | null;
    averageOrderValue: number | null;
  }
): number | null {
  if (metric === "deliveredRevenue") return bag.deliveredRevenue;
  if (metric === "deliveredProfit") return bag.deliveredProfit;
  if (metric === "ordersPlaced") return bag.ordersPlaced;
  if (metric === "ordersDelivered") return bag.ordersDelivered;
  if (metric === "deliveryRate") return bag.deliveryRate;
  if (metric === "cancellationRate") return bag.cancellationRate;
  return bag.averageOrderValue;
}

export function drillOrdersByIds(orders: AnalyticsOrder[], ids: string[]): DrillOrder[] {
  const want = new Set(ids);
  return liveOrders(orders)
    .filter((o) => want.has(o.orderId))
    .map(toDrill);
}
