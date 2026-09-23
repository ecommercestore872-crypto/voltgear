import {
  buildCityPerformance,
  buildCustomerAnalytics,
  buildExecutiveSnapshot,
  buildOrderFunnel,
  buildProductPerformance,
  firstReachedAt,
  isoInRange,
  liveOrders,
  parseIso,
  type AnalyticsOrder,
  type CityPerfRow,
  type CustomerAnalytics,
  type ExecutiveSnapshot,
  type FunnelStep,
  type ProductCostRow,
  type ProductPerfRow,
  type YmdRange,
} from "./analytics-rules";
import {
  buildProfitLayer,
  priorYmdRange,
  type AdSpendBySource,
  type ProfitLayer,
} from "./analytics-profit-rules";
import {
  buildCoach,
  perfFromAnalytics,
  type CoachBundle,
  type CoachCatalogProduct,
} from "./analytics-coach-rules";
import {
  FULFILLMENT_MATURITY_HOURS,
  buildInsights,
  type BuildInsightsInput,
  type InsightCard,
} from "./analytics-insight-rules";
import {
  buildDeliveredBySource,
  buildLandingPages,
  buildSessionsBySource,
  buildShopFunnel,
  countCohortVisitors,
  trafficRangeAvailable,
  type AttributedOrder,
  type DeliveredBySourceRow,
  type LandingPageRow,
  type SessionsBySourceRow,
  type ShopFunnelStep,
  type TrafficEvent,
  type TrafficSession,
} from "./analytics-traffic-rules";

export type BundleOrder = AnalyticsOrder & {
  sessionId?: string | null;
  source?: string | null;
};

export type AnalyticsTraffic = {
  available: boolean;
  visitors: number | null;
  sessions: number | null;
  convertedSessions: number | null;
  bySource: SessionsBySourceRow[] | null;
  landingPages: LandingPageRow[] | null;
  deliveredBySource: DeliveredBySourceRow[];
};

export type AnalyticsBundle = {
  range: YmdRange;
  executive: ExecutiveSnapshot;
  products: ProductPerfRow[];
  cities: CityPerfRow[];
  customers: CustomerAnalytics;
  funnel: FunnelStep[];
  traffic: AnalyticsTraffic;
  shopFunnel: ShopFunnelStep[] | null;
  insights: InsightCard[];
  retentionNotice: boolean;
} & ProfitLayer & { coach: CoachBundle };

export type AssembleAnalyticsBundleInput = {
  now: Date;
  range: YmdRange;
  orders: BundleOrder[];
  costs?: ProductCostRow[];
  sessions: TrafficSession[];
  events: TrafficEvent[];
  spend?: AdSpendBySource;
  catalog?: CoachCatalogProduct[];
  shippingFee?: number;
  budget?: number;
  freeShippingThreshold?: number;
  packingFee?: number;
  codFee?: number;
};

function toAttributed(order: BundleOrder): AttributedOrder {
  return {
    orderId: order.orderId,
    createdAt: order.createdAt,
    sessionId: order.sessionId ?? null,
    source: order.source ?? null,
    isDemo: order.isDemo,
    total: typeof order.total === "number" && Number.isFinite(order.total) ? order.total : 0,
  };
}

function deliveredInRange(orders: BundleOrder[], range: YmdRange): BundleOrder[] {
  return liveOrders(orders).filter(
    (o) => o.status !== "cancelled" && isoInRange(firstReachedAt(o, "delivered"), range)
  ) as BundleOrder[];
}

function shopRates(funnel: ShopFunnelStep[]): BuildInsightsInput["shop"] {
  const rate = (key: string) => funnel.find((s) => s.key === key)?.conversionFromPrevious ?? null;
  return {
    pvRate: rate("product_view"),
    atcRate: rate("add_to_cart"),
    checkoutRate: rate("checkout_started"),
    convertRate: rate("converted"),
  };
}

function liveCohort(sessions: TrafficSession[], range: YmdRange): TrafficSession[] {
  return sessions.filter((s) => s.isDemo === false && isoInRange(s.startedAt, range));
}

function convertedSessionIds(orders: AttributedOrder[], cohortIds: Set<string>): Set<string> {
  const ids = new Set<string>();
  for (const order of orders) {
    if (order.isDemo === true) continue;
    if (order.sessionId && cohortIds.has(order.sessionId)) {
      ids.add(order.sessionId);
    }
  }
  return ids;
}

function sourceInsightRows(
  sessions: TrafficSession[],
  convertedIds: Set<string>,
  range: YmdRange
): BuildInsightsInput["sources"] {
  return buildSessionsBySource(sessions, range).map((row) => {
    const matching = liveCohort(sessions, range).filter(
      (s) => (s.source ?? "").trim() === row.source
    );
    const converted = matching.filter((s) => convertedIds.has(s.id)).length;
    return {
      source: row.source,
      sessions: row.sessions,
      convertedRate: matching.length ? converted / matching.length : 0,
    };
  });
}

function landingInsightRows(
  sessions: TrafficSession[],
  events: TrafficEvent[],
  range: YmdRange
): BuildInsightsInput["landings"] {
  const pvIds = new Set(
    events.filter((e) => e.name === "product_view").map((e) => e.sessionId)
  );
  return buildLandingPages(sessions, range).map((row) => {
    const matching = liveCohort(sessions, range).filter(
      (s) => (s.landingPath ?? "").trim() === row.path
    );
    const reached = matching.filter((s) => pvIds.has(s.id)).length;
    return {
      path: row.path,
      sessions: row.sessions,
      pvReachRate: matching.length ? reached / matching.length : 0,
    };
  });
}

function validationEventsForCohort(
  events: TrafficEvent[],
  cohortIds: Set<string>
): { category: string }[] {
  const out: { category: string }[] = [];
  for (const event of events) {
    if (event.name !== "checkout_validation_error" || !cohortIds.has(event.sessionId)) continue;
    const category = event.properties?.category;
    if (typeof category === "string" && category.trim()) {
      out.push({ category: category.trim() });
    }
  }
  return out;
}

function matureFulfillment(
  orders: AnalyticsOrder[],
  range: YmdRange,
  now: Date
): { placed: number; processingReached: number; cancelled: number } {
  const cutoff = now.getTime() - FULFILLMENT_MATURITY_HOURS * 60 * 60 * 1000;
  const mature = liveOrders(orders).filter((o) => {
    if (!isoInRange(o.createdAt, range)) return false;
    const t = parseIso(o.createdAt);
    return !Number.isNaN(t) && t <= cutoff;
  });
  return {
    placed: mature.length,
    processingReached: mature.filter((o) => firstReachedAt(o, "processing") != null).length,
    cancelled: mature.filter((o) => (o.status ?? "") === "cancelled").length,
  };
}

export function assembleAnalyticsBundle(input: AssembleAnalyticsBundleInput): AnalyticsBundle {
  const { now, range, orders, sessions, events } = input;
  const costs = input.costs ?? [];
  const trafficAvailable = trafficRangeAvailable(range, now);
  const attributed = orders.map(toAttributed);
  const deliveredOrders = deliveredInRange(orders, range).map(toAttributed);
  const deliveredBySource = buildDeliveredBySource(deliveredOrders);

  let visitors: number | null = null;
  let sessionCount: number | null = null;
  let convertedSessions: number | null = null;
  let bySource: SessionsBySourceRow[] | null = null;
  let landingPages: LandingPageRow[] | null = null;
  let shopFunnel: ShopFunnelStep[] | null = null;
  let insightShop: BuildInsightsInput["shop"] = {
    pvRate: null,
    atcRate: null,
    checkoutRate: null,
    convertRate: null,
  };
  let insightSources: BuildInsightsInput["sources"] = [];
  let insightLandings: BuildInsightsInput["landings"] = [];
  let insightValidation: BuildInsightsInput["validationEvents"] = [];
  let prior: BuildInsightsInput["prior"] = null;

  if (trafficAvailable) {
    shopFunnel = buildShopFunnel(sessions, events, attributed, range);
    visitors = countCohortVisitors(sessions, range);
    sessionCount = shopFunnel[0]?.count ?? 0;
    convertedSessions = shopFunnel.find((s) => s.key === "converted")?.count ?? 0;
    bySource = buildSessionsBySource(sessions, range);
    landingPages = buildLandingPages(sessions, range);
    insightShop = shopRates(shopFunnel);
    const cohort = liveCohort(sessions, range);
    const cohortIds = new Set(cohort.map((s) => s.id));
    const convertedIds = convertedSessionIds(attributed, cohortIds);
    insightSources = sourceInsightRows(sessions, convertedIds, range);
    insightLandings = landingInsightRows(sessions, events, range);
    insightValidation = validationEventsForCohort(events, cohortIds);

    const priorRange = priorYmdRange(range);
    if (trafficRangeAvailable(priorRange, now)) {
      const priorFunnel = buildShopFunnel(sessions, events, attributed, priorRange);
      prior = {
        trafficAvailable: true,
        sessionCount: priorFunnel[0]?.count ?? 0,
        shop: shopRates(priorFunnel),
      };
    }
  }

  const mature = matureFulfillment(orders, range, now);
  const priorMatureCounts = matureFulfillment(orders, priorYmdRange(range), now);

  const insights = buildInsights({
    now,
    trafficAvailable,
    sessionCount: sessionCount ?? 0,
    convertedSessions: convertedSessions ?? 0,
    shop: insightShop,
    prior,
    sources: insightSources,
    landings: insightLandings,
    validationEvents: insightValidation,
    maturePlaced: mature.placed,
    matureProcessingReached: mature.processingReached,
    matureCancelled: mature.cancelled,
    priorMature: priorMatureCounts,
  });

  const executive = buildExecutiveSnapshot(orders, range, costs);
  const products = buildProductPerformance(orders, range, costs);
  const profit = buildProfitLayer({
    orders,
    range,
    costs,
    sessions,
    events,
    spend: input.spend,
  });
  const defaultBudget = (input.spend ? Object.values(input.spend) : []).reduce(
    (s, n) => s + Math.max(0, Number(n) || 0),
    0
  );
  const coach = buildCoach({
    catalog: input.catalog ?? [],
    perf: perfFromAnalytics(products, profit.productConversion),
    shippingFee: input.shippingFee ?? 0,
    rtoRate: profit.rto.shippedCount > 0 ? profit.rto.count / profit.rto.shippedCount : 0,
    shopDeliveryRate: executive.deliverySuccessRate,
    sourceMoney: profit.sourceMoney,
    budget: input.budget ?? defaultBudget,
    orders,
    range,
    now,
    freeShippingThreshold: input.freeShippingThreshold ?? 0,
    packingFee: input.packingFee ?? 0,
    codFee: input.codFee ?? 0,
  });

  return {
    range,
    executive,
    products,
    cities: buildCityPerformance(orders, range),
    customers: buildCustomerAnalytics(orders, range),
    funnel: buildOrderFunnel(orders, range),
    traffic: {
      available: trafficAvailable,
      visitors,
      sessions: sessionCount,
      convertedSessions,
      bySource,
      landingPages,
      deliveredBySource,
    },
    shopFunnel,
    insights,
    retentionNotice: !trafficAvailable,
    ...profit,
    coach,
  };
}
