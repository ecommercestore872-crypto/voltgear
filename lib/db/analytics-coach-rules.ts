import {
  firstReachedAt,
  isoInRange,
  lineAmount,
  liveOrders,
  parseIso,
  type AnalyticsItem,
  type AnalyticsOrder,
  type ProductPerfRow,
  type YmdRange,
} from "./analytics-rules";
import type { ProductConversionRow } from "./analytics-profit-rules";

export const TARGET_PROFIT_BUFFER = 0.2;
export const HIGH_CANCEL_RATE = 0.25;
export const MEDIUM_CANCEL_RATE = 0.15;
export const WEAK_VIEW_TO_CART = 0.05;
export const COACH_MATURITY_HOURS = 72;
export const COACH_MIN_SAMPLE = 5;

export type CoachCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  costPrice: number | null;
};

export type CoachPerf = {
  slug: string;
  name: string;
  deliveredRevenue: number;
  deliveredGrossProfit: number | null;
  cancellationRate: number | null;
  deliverySuccessRate: number | null;
  views: number;
  addToCart: number;
  viewToCart: number | null;
  ordersPlaced: number;
};

export type CoachVerdict = "safe" | "too_cheap" | "fill_cost" | "not_enough_data";
export type CoachHealth = "performing" | "needs_improvement" | "weak";

export type CoachChannelSlice = {
  source: string;
  amount: number;
  note: string;
};

export type CoachProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  costPrice: number | null;
  floor: number | null;
  contribution: number | null;
  contributionMargin: number | null;
  breakEvenRoas: number | null;
  verdict: CoachVerdict;
  health: CoachHealth;
  canAdvertise: boolean;
  reason: string;
  suggestedSpend: number;
  channelSplit: CoachChannelSlice[];
  deliverySuccessRate: number | null;
  cancellationRate: number | null;
  adWeight: number;
  listedPrice: number;
  sellingPrice: number;
  shippingAllocated: number;
  matureSample: number;
  thinSample: boolean;
};

export type CoachChannelAdvice = {
  source: string;
  deliveredRevenue: number;
  spend: number;
  roas: number | null;
  action: "scale" | "hold" | "cut" | "unknown";
  reason: string;
};

export type CoachBundle = {
  shippingFee: number;
  freeShippingThreshold: number;
  packingFee: number;
  codFee: number;
  targetBuffer: number;
  maturityHours: number;
  products: CoachProductRow[];
  channels: CoachChannelAdvice[];
  defaultBudget: number;
};

export type CoachSourceMoney = {
  source: string;
  deliveredRevenue: number;
  spend: number;
  roas: number | null;
};

function money(n: number | null | undefined): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export type CoachShippingSettings = {
  shippingFee: number;
  freeShippingThreshold: number;
};

function merchandiseTotal(order: AnalyticsOrder): number {
  if (typeof order.subtotal === "number" && Number.isFinite(order.subtotal) && order.subtotal > 0) {
    return order.subtotal;
  }
  return (order.items ?? []).reduce((sum, item) => sum + lineAmount(item), 0);
}

function itemQty(item: AnalyticsItem): number {
  return Number(item.quantity ?? 1) || 1;
}

export function orderShippingAmount(order: AnalyticsOrder, settings: CoachShippingSettings): number {
  if (typeof order.shipping === "number" && Number.isFinite(order.shipping)) {
    return Math.max(0, order.shipping);
  }
  const merch = merchandiseTotal(order);
  if (settings.freeShippingThreshold > 0 && merch >= settings.freeShippingThreshold) return 0;
  return Math.max(0, money(settings.shippingFee));
}

export function isPrepaidPayment(payment: string | null | undefined): boolean {
  const value = (payment ?? "cod").trim().toLowerCase();
  if (!value || value === "cod" || value === "cash") return false;
  return true;
}

function extrasForOrder(order: AnalyticsOrder, packingFee: number, codFee: number): number {
  const packing = Math.max(0, money(packingFee));
  const cod = isPrepaidPayment(order.payment) ? 0 : Math.max(0, money(codFee));
  return packing + cod;
}

export function allocatedUnitShare(order: AnalyticsOrder, slug: string, amount: number): number {
  if (!(amount > 0)) return 0;
  const items = order.items ?? [];
  const merch = items.reduce((sum, item) => sum + lineAmount(item), 0);
  const matched = items.filter((item) => (item.slug?.trim() || "") === slug);
  const lineRev = matched.reduce((sum, item) => sum + lineAmount(item), 0);
  const qty = matched.reduce((sum, item) => sum + itemQty(item), 0);
  if (qty <= 0 || merch <= 0) return 0;
  return (amount * lineRev) / merch / qty;
}

export function expectedSoloShipping(price: number, settings: CoachShippingSettings): number {
  if (settings.freeShippingThreshold > 0 && price >= settings.freeShippingThreshold) return 0;
  return Math.max(0, money(settings.shippingFee));
}

export function averagePaidUnitPrice(orders: AnalyticsOrder[], slug: string, range: YmdRange): number | null {
  let revenue = 0;
  let qty = 0;
  for (const order of liveOrders(orders)) {
    if ((order.status ?? "") === "cancelled") continue;
    if (!isoInRange(firstReachedAt(order, "delivered"), range)) continue;
    for (const item of order.items ?? []) {
      if ((item.slug?.trim() || "") !== slug) continue;
      revenue += lineAmount(item);
      qty += itemQty(item);
    }
  }
  if (qty <= 0) return null;
  return revenue / qty;
}

function averageAllocatedAmount(
  orders: AnalyticsOrder[],
  slug: string,
  range: YmdRange,
  amountForOrder: (order: AnalyticsOrder) => number
): number | null {
  const units: number[] = [];
  for (const order of liveOrders(orders)) {
    if ((order.status ?? "") === "cancelled") continue;
    if (!isoInRange(firstReachedAt(order, "delivered"), range)) continue;
    if (!orderHasSlug(order, slug)) continue;
    units.push(allocatedUnitShare(order, slug, amountForOrder(order)));
  }
  if (!units.length) return null;
  return units.reduce((s, n) => s + n, 0) / units.length;
}

export function averageAllocatedShipping(
  orders: AnalyticsOrder[],
  slug: string,
  range: YmdRange,
  settings: CoachShippingSettings
): number | null {
  return averageAllocatedAmount(orders, slug, range, (order) => orderShippingAmount(order, settings));
}

export function averageAllocatedExtras(
  orders: AnalyticsOrder[],
  slug: string,
  range: YmdRange,
  packingFee: number,
  codFee: number
): number | null {
  return averageAllocatedAmount(orders, slug, range, (order) => extrasForOrder(order, packingFee, codFee));
}

function isMature(order: AnalyticsOrder, now: Date, hours: number): boolean {
  const t = parseIso(order.createdAt);
  return !Number.isNaN(t) && t <= now.getTime() - hours * 3_600_000;
}

function orderHasSlug(order: AnalyticsOrder, slug: string): boolean {
  return (order.items ?? []).some((item) => (item.slug?.trim() || "") === slug);
}

export function matureOutcomeRates(
  orders: AnalyticsOrder[],
  slug: string | null,
  range: YmdRange,
  now: Date,
  hours = COACH_MATURITY_HOURS
): { deliveryRate: number | null; cancelRate: number | null; sample: number } {
  const placed = liveOrders(orders).filter((order) => {
    if (!isoInRange(order.createdAt, range)) return false;
    if (!isMature(order, now, hours)) return false;
    if (slug && !orderHasSlug(order, slug)) return false;
    return true;
  });
  if (!placed.length) return { deliveryRate: null, cancelRate: null, sample: 0 };
  const delivered = placed.filter((order) => (order.status ?? "") === "delivered").length;
  const cancelled = placed.filter((order) => (order.status ?? "") === "cancelled").length;
  return {
    deliveryRate: delivered / placed.length,
    cancelRate: cancelled / placed.length,
    sample: placed.length,
  };
}

export function canonicalAdSource(source: string): string {
  const key = source.trim().toLowerCase();
  if (key === "facebook" || key === "instagram") return "meta";
  return key || "unattributed";
}

export function safeSellingFloor(input: {
  cost: number | null | undefined;
  shippingFee: number;
  deliveryRate: number | null;
  rtoRate: number;
  packingFee?: number;
  codFee?: number;
}): number | null {
  if (input.cost == null || !Number.isFinite(input.cost) || input.cost < 0) return null;
  const variable =
    Math.max(0, money(input.shippingFee)) +
    Math.max(0, money(input.packingFee)) +
    Math.max(0, money(input.codFee));
  const delivery = input.deliveryRate != null && input.deliveryRate > 0 ? input.deliveryRate : 1;
  const rto = Math.max(0, money(input.rtoRate));
  const leak = variable * (1 + rto / delivery);
  const needed = (input.cost + leak) / (1 - TARGET_PROFIT_BUFFER);
  return Math.ceil(needed - 1e-9);
}

function roundMoney(n: number): number {
  return Math.round(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function splitByWeight<T extends { weight: number }>(
  total: number,
  rows: T[]
): (T & { amount: number })[] {
  if (total <= 0 || rows.length === 0) return rows.map((row) => ({ ...row, amount: 0 }));
  const positive = rows.map((row) => ({ ...row, weight: Math.max(0, row.weight) }));
  const sum = positive.reduce((s, row) => s + row.weight, 0);
  const weights = sum > 0 ? positive : positive.map((row) => ({ ...row, weight: 1 }));
  const den = weights.reduce((s, row) => s + row.weight, 0);
  const raw = weights.map((row) => {
    const exact = (row.weight / den) * total;
    return { ...row, floor: Math.floor(exact), rem: exact - Math.floor(exact), amount: 0 };
  });
  let leftover = total - raw.reduce((s, row) => s + row.floor, 0);
  raw.sort((a, b) => b.rem - a.rem);
  for (const row of raw) {
    row.amount = row.floor + (leftover > 0 ? 1 : 0);
    if (leftover > 0) leftover -= 1;
  }
  return raw;
}

export function allocateAdBudget(
  products: {
    slug: string;
    health: CoachHealth;
    canAdvertise: boolean;
    weight: number;
  }[],
  budget: number
): { slug: string; amount: number }[] {
  const total = Math.max(0, roundMoney(budget));
  const performing = products.filter((p) => p.health === "performing" && p.canAdvertise);
  const improve = products.filter((p) => p.health === "needs_improvement" && p.canAdvertise);
  const weak = products.filter((p) => p.health === "weak" && p.canAdvertise);
  let performShare = 0.7;
  let improveShare = 0.2;
  let weakShare = 0.1;
  if (weak.length === 0) {
    performShare += weakShare;
    weakShare = 0;
  }
  if (performing.length === 0) {
    improveShare += performShare;
    performShare = 0;
  }
  if (improve.length === 0) {
    performShare += improveShare;
    improveShare = 0;
  }
  const performTotal = roundMoney(total * performShare);
  const improveTotal = roundMoney(total * improveShare);
  const weakTotal = total - performTotal - improveTotal;
  const amounts = new Map<string, number>();
  for (const p of products) amounts.set(p.slug, 0);
  for (const row of splitByWeight(performTotal, performing)) amounts.set(row.slug, row.amount);
  for (const row of splitByWeight(improveTotal, improve)) amounts.set(row.slug, row.amount);
  for (const row of splitByWeight(Math.max(0, weakTotal), weak)) amounts.set(row.slug, row.amount);
  return products.map((p) => ({ slug: p.slug, amount: amounts.get(p.slug) ?? 0 }));
}

export function splitAcrossChannels(
  amount: number,
  channels: { source: string; roas: number | null; deliveredRevenue: number; spend: number }[]
): CoachChannelSlice[] {
  const paid = channels.filter((c) => canonicalAdSource(c.source) !== "unattributed");
  const unique = new Map<string, { source: string; roas: number | null; deliveredRevenue: number; spend: number }>();
  for (const row of paid) {
    const source = canonicalAdSource(row.source);
    const current = unique.get(source);
    if (!current) unique.set(source, { ...row, source });
    else {
      unique.set(source, {
        source,
        roas:
          current.roas != null || row.roas != null
            ? money(current.roas) + money(row.roas) > 0
              ? (money(current.deliveredRevenue) + money(row.deliveredRevenue)) /
                  Math.max(0.0001, money(current.spend) + money(row.spend))
              : null
            : null,
        deliveredRevenue: current.deliveredRevenue + row.deliveredRevenue,
        spend: current.spend + row.spend,
      });
    }
  }
  const list = Array.from(unique.values());
  const hasRoas = list.some((c) => c.roas != null && c.roas > 0 && c.spend > 0);
  const weights = list.map((c) => ({
    ...c,
    weight: hasRoas ? Math.max(0, c.roas ?? 0) : Math.max(0, c.deliveredRevenue),
  }));
  const note = hasRoas
    ? "More money to the channel with better delivered return."
    : "Split by delivered cash, not ROAS — type spend before trusting this.";
  if (amount <= 0) {
    return weights.map((c) => ({ source: c.source, amount: 0, note }));
  }
  if (weights.every((c) => c.weight === 0)) {
    const even = splitByWeight(
      amount,
      (weights.length ? weights : [{ source: "tiktok", weight: 1 }, { source: "meta", weight: 1 }]).map((c) => ({
        source: "source" in c ? c.source : "tiktok",
        weight: 1,
      }))
    );
    return even.map((c) => ({
      source: c.source,
      amount: c.amount,
      note: "Start a small test. We cannot invent ROAS until you type spend.",
    }));
  }
  return splitByWeight(amount, weights).map((c) => ({
    source: c.source,
    amount: c.amount,
    note,
  }));
}

function classify(input: {
  verdict: CoachVerdict;
  cancelRate: number | null;
  viewToCart: number | null;
  views: number;
  deliveredRevenue: number;
  thinSample: boolean;
}): { health: CoachHealth; canAdvertise: boolean; reason: string } {
  if (input.verdict === "fill_cost") {
    return {
      health: "weak",
      canAdvertise: false,
      reason: "Fill cost first. Without it we cannot tell if ads or this price would lose money.",
    };
  }
  if (input.verdict === "too_cheap") {
    return {
      health: "weak",
      canAdvertise: false,
      reason: "What customers actually paid is below the safe floor. Raising ads here would lose more money.",
    };
  }
  if (input.thinSample) {
    return {
      health: "needs_improvement",
      canAdvertise: input.verdict === "safe",
      reason: `Not enough finished orders yet (need ${COACH_MIN_SAMPLE} older than ${COACH_MATURITY_HOURS / 24} days). In-transit parcels are not treated as failed.`,
    };
  }
  if (input.cancelRate != null && input.cancelRate >= HIGH_CANCEL_RATE) {
    return {
      health: "weak",
      canAdvertise: false,
      reason: "Too many of these orders cancel. Fix confirmation and cities before ads.",
    };
  }
  const weakPage = input.views >= 20 && input.viewToCart != null && input.viewToCart < WEAK_VIEW_TO_CART;
  const mediumCancel = input.cancelRate != null && input.cancelRate >= MEDIUM_CANCEL_RATE;
  if (weakPage || mediumCancel) {
    return {
      health: "needs_improvement",
      canAdvertise: true,
      reason: weakPage
        ? "People look but rarely add to cart. Fix the product page before you scale ads."
        : "Cancels are eating margin. Keep ads small until delivery improves.",
    };
  }
  if (input.deliveredRevenue > 0 && input.verdict === "safe") {
    return {
      health: "performing",
      canAdvertise: true,
      reason: "Delivered cash, price covers cost and leak, cancels are under control. This can take ads.",
    };
  }
  return {
    health: "needs_improvement",
    canAdvertise: input.verdict === "safe",
    reason: "Not enough delivered sales yet. Test a small budget after the price is safe.",
  };
}

export function buildCoach(input: {
  catalog: CoachCatalogProduct[];
  perf: CoachPerf[];
  shippingFee: number;
  rtoRate: number;
  shopDeliveryRate: number | null;
  sourceMoney: CoachSourceMoney[];
  budget: number;
  orders?: AnalyticsOrder[];
  range?: YmdRange;
  now?: Date;
  freeShippingThreshold?: number;
  packingFee?: number;
  codFee?: number;
}): CoachBundle {
  const perfBySlug = new Map(input.perf.map((p) => [p.slug, p]));
  const shippingFee = Math.max(0, money(input.shippingFee));
  const freeShippingThreshold = Math.max(0, money(input.freeShippingThreshold));
  const packingFee = Math.max(0, money(input.packingFee));
  const codFee = Math.max(0, money(input.codFee));
  const rtoRate = Math.max(0, money(input.rtoRate));
  const settings: CoachShippingSettings = { shippingFee, freeShippingThreshold };
  const orders = input.orders ?? [];
  const range = input.range;
  const now = input.now ?? new Date();
  const useOrders = orders.length > 0 && range != null;
  const shopMature = useOrders
    ? matureOutcomeRates(orders, null, range, now)
    : { deliveryRate: input.shopDeliveryRate, cancelRate: null, sample: 0 };
  const products: CoachProductRow[] = [];

  for (const item of input.catalog) {
    const perf = perfBySlug.get(item.slug);
    const paid = useOrders ? averagePaidUnitPrice(orders, item.slug, range) : null;
    const sellingPrice = paid ?? item.price;
    const allocatedShip = useOrders ? averageAllocatedShipping(orders, item.slug, range, settings) : null;
    const shippingForFloor = allocatedShip ?? expectedSoloShipping(sellingPrice, settings);
    const allocatedExtras = useOrders
      ? averageAllocatedExtras(orders, item.slug, range, packingFee, codFee)
      : null;
    const extrasForFloor = allocatedExtras ?? packingFee + codFee;
    const productMature = useOrders
      ? matureOutcomeRates(orders, item.slug, range, now)
      : { deliveryRate: null, cancelRate: null, sample: 0 };
    const thinSample = useOrders && productMature.sample < COACH_MIN_SAMPLE;
    const delivery =
      !useOrders
        ? (perf?.deliverySuccessRate ?? input.shopDeliveryRate)
        : productMature.sample >= COACH_MIN_SAMPLE
          ? productMature.deliveryRate
          : (shopMature.deliveryRate ?? perf?.deliverySuccessRate ?? input.shopDeliveryRate);
    const cancelRate = useOrders
      ? productMature.sample >= COACH_MIN_SAMPLE
        ? productMature.cancelRate
        : shopMature.cancelRate
      : (perf?.cancellationRate ?? null);

    const floor = safeSellingFloor({
      cost: item.costPrice,
      shippingFee: shippingForFloor,
      packingFee: extrasForFloor,
      codFee: 0,
      deliveryRate: delivery,
      rtoRate,
    });
    let verdict: CoachVerdict = "safe";
    if (item.costPrice == null) verdict = "fill_cost";
    else if (floor == null) verdict = "not_enough_data";
    else if (sellingPrice + 0.5 < floor) verdict = "too_cheap";

    const leak =
      delivery != null && delivery > 0
        ? (shippingForFloor + extrasForFloor) * (1 + rtoRate / delivery)
        : shippingForFloor + extrasForFloor;
    const contribution =
      item.costPrice != null && verdict !== "fill_cost" ? sellingPrice - item.costPrice - leak : null;
    const contributionMargin =
      contribution != null && sellingPrice > 0 ? contribution / sellingPrice : null;
    const breakEvenRoas =
      contributionMargin != null && contributionMargin > 0 ? round2(1 / contributionMargin) : null;

    const classed = classify({
      verdict,
      cancelRate,
      viewToCart: perf?.viewToCart ?? null,
      views: perf?.views ?? 0,
      deliveredRevenue: perf?.deliveredRevenue ?? 0,
      thinSample,
    });

    products.push({
      id: item.id,
      slug: item.slug,
      name: item.name,
      price: item.price,
      costPrice: item.costPrice,
      floor,
      contribution: contribution != null ? roundMoney(contribution) : null,
      contributionMargin: contributionMargin != null ? round2(contributionMargin) : null,
      breakEvenRoas,
      verdict,
      health: classed.health,
      canAdvertise: classed.canAdvertise,
      reason: classed.reason,
      suggestedSpend: 0,
      channelSplit: [],
      deliverySuccessRate: delivery ?? null,
      cancellationRate: cancelRate,
      adWeight: Math.max(0, perf?.deliveredGrossProfit ?? perf?.deliveredRevenue ?? 0),
      listedPrice: item.price,
      sellingPrice,
      shippingAllocated: shippingForFloor,
      matureSample: productMature.sample,
      thinSample,
    });
  }

  const budgetRows = allocateAdBudget(
    products.map((p) => ({
      slug: p.slug,
      health: p.health,
      canAdvertise: p.canAdvertise,
      weight: p.adWeight,
    })),
    input.budget
  );
  const spendBySlug = new Map(budgetRows.map((r) => [r.slug, r.amount]));
  const channelsForSplit = input.sourceMoney.map((s) => ({
    source: canonicalAdSource(s.source),
    roas: s.roas,
    deliveredRevenue: s.deliveredRevenue,
    spend: s.spend,
  }));

  for (const product of products) {
    product.suggestedSpend = spendBySlug.get(product.slug) ?? 0;
    product.channelSplit = splitAcrossChannels(product.suggestedSpend, channelsForSplit);
  }

  const order: Record<CoachHealth, number> = { performing: 0, needs_improvement: 1, weak: 2 };
  products.sort((a, b) => order[a.health] - order[b.health] || b.suggestedSpend - a.suggestedSpend);

  const avgBe =
    products.filter((p) => p.breakEvenRoas != null).reduce((s, p) => s + (p.breakEvenRoas ?? 0), 0) /
    Math.max(1, products.filter((p) => p.breakEvenRoas != null).length);

  const channelMap = new Map<string, CoachSourceMoney>();
  for (const row of input.sourceMoney) {
    const source = canonicalAdSource(row.source);
    if (source === "unattributed") continue;
    const current = channelMap.get(source);
    if (!current) channelMap.set(source, { ...row, source });
    else {
      const spend = current.spend + row.spend;
      const deliveredRevenue = current.deliveredRevenue + row.deliveredRevenue;
      channelMap.set(source, {
        source,
        deliveredRevenue,
        spend,
        roas: spend > 0 ? deliveredRevenue / spend : null,
      });
    }
  }
  if (!channelMap.has("tiktok")) {
    channelMap.set("tiktok", { source: "tiktok", deliveredRevenue: 0, spend: 0, roas: null });
  }
  if (!channelMap.has("meta")) {
    channelMap.set("meta", { source: "meta", deliveredRevenue: 0, spend: 0, roas: null });
  }

  const channels: CoachChannelAdvice[] = Array.from(channelMap.values()).map((row) => {
    if (!(row.spend > 0) || row.roas == null) {
      return {
        source: row.source,
        deliveredRevenue: row.deliveredRevenue,
        spend: row.spend,
        roas: row.roas,
        action: "unknown" as const,
        reason: "Type what you spent here this period. ROAS is not invented.",
      };
    }
    if (avgBe > 0 && row.roas + 1e-9 < avgBe) {
      return {
        ...row,
        action: "cut" as const,
        reason: `Delivered return ${round2(row.roas)}× is below the shop break-even around ${round2(avgBe)}×.`,
      };
    }
    if (avgBe > 0 && row.roas >= avgBe * 1.15) {
      return {
        ...row,
        action: "scale" as const,
        reason: `Delivered return ${round2(row.roas)}× is above break-even. This channel can take more of the budget.`,
      };
    }
    return {
      ...row,
      action: "hold" as const,
      reason: "Return is covering product cost. Do not scale until it sits clearly above break-even.",
    };
  });

  channels.sort((a, b) => b.deliveredRevenue - a.deliveredRevenue);

  return {
    shippingFee,
    freeShippingThreshold,
    packingFee,
    codFee,
    targetBuffer: TARGET_PROFIT_BUFFER,
    maturityHours: COACH_MATURITY_HOURS,
    products,
    channels,
    defaultBudget: roundMoney(input.sourceMoney.reduce((s, row) => s + Math.max(0, row.spend), 0)),
  };
}

export function applyCoachBudget(coach: CoachBundle, budget: number, sourceMoney: CoachSourceMoney[]): CoachBundle {
  const products = coach.products.map((p) => ({ ...p }));
  const budgetRows = allocateAdBudget(
    products.map((p) => ({
      slug: p.slug,
      health: p.health,
      canAdvertise: p.canAdvertise,
      weight: p.adWeight,
    })),
    budget
  );
  const spendBySlug = new Map(budgetRows.map((r) => [r.slug, r.amount]));
  const channelsForSplit = sourceMoney.map((s) => ({
    source: canonicalAdSource(s.source),
    roas: s.roas,
    deliveredRevenue: s.deliveredRevenue,
    spend: s.spend,
  }));
  for (const product of products) {
    product.suggestedSpend = spendBySlug.get(product.slug) ?? 0;
    product.channelSplit = splitAcrossChannels(product.suggestedSpend, channelsForSplit);
  }
  const order: Record<CoachHealth, number> = { performing: 0, needs_improvement: 1, weak: 2 };
  products.sort((a, b) => order[a.health] - order[b.health] || b.suggestedSpend - a.suggestedSpend);
  return { ...coach, products };
}

export function perfFromAnalytics(
  products: ProductPerfRow[],
  conversion: ProductConversionRow[]
): CoachPerf[] {
  const conv = new Map(conversion.map((c) => [c.slug, c]));
  return products.map((p) => {
    const c = conv.get(p.slug);
    return {
      slug: p.slug,
      name: p.name,
      deliveredRevenue: p.deliveredRevenue,
      deliveredGrossProfit: p.deliveredGrossProfit,
      cancellationRate: p.cancellationRate,
      deliverySuccessRate: p.deliverySuccessRate,
      views: c?.views ?? 0,
      addToCart: c?.addToCart ?? 0,
      viewToCart: c?.viewToCart ?? null,
      ordersPlaced: c?.ordersPlaced ?? p.orderIds.length,
    };
  });
}

export function parseCoachCostItems(
  raw: unknown
): { ok: true; items: { slug: string; costPrice: number }[] } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Send the product costs to save." };
  }
  const rawItems = (raw as { items?: unknown }).items;
  if (rawItems !== undefined && !Array.isArray(rawItems)) {
    return { ok: false, error: "Send the product costs to save." };
  }
  const items = Array.isArray(rawItems) ? rawItems : [];
  const out: { slug: string; costPrice: number }[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const slug = String((item as { slug?: unknown }).slug ?? "").trim();
    const costRaw = (item as { costPrice?: unknown }).costPrice;
    const costPrice = typeof costRaw === "number" ? costRaw : Number(costRaw);
    if (!slug || !Number.isFinite(costPrice) || costPrice < 0) continue;
    out.push({ slug, costPrice });
  }
  return { ok: true, items: out };
}

export function parseCoachFees(raw: unknown): { packingFee?: number; codFee?: number } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: { packingFee?: number; codFee?: number } = {};
  for (const key of ["packingFee", "codFee"] as const) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const amount = Number((raw as Record<string, unknown>)[key]);
    if (Number.isFinite(amount) && amount >= 0) out[key] = amount;
  }
  return out;
}
