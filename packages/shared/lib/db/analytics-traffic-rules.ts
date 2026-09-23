import { isoInRange, karachiYmd, parseIso, type YmdRange } from "./analytics-rules";

export const RAW_RETENTION_DAYS = 90;

export type TrafficEvent = {
  sessionId: string;
  name: string;
  occurredAt: string;
  properties?: Record<string, unknown>;
  productSlug?: string | null;
  path?: string | null;
};

export type TrafficSession = {
  id: string;
  visitorId: string;
  startedAt: string;
  isDemo: boolean;
  source: string | null;
  landingPath: string | null;
};

export type AttributedOrder = {
  orderId: string;
  createdAt: string;
  sessionId: string | null;
  source: string | null;
  isDemo?: boolean;
  total?: number;
};

export type ShopFunnelStep = {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number | null;
};

export type SessionsBySourceRow = {
  source: string;
  sessions: number;
};

export type LandingPageRow = {
  path: string;
  sessions: number;
};

export type DeliveredBySourceRow = {
  source: string;
  orders: number;
  deliveredRevenue: number;
};

function rate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

function cohortSessions(sessions: TrafficSession[], range: YmdRange): TrafficSession[] {
  return sessions.filter((s) => s.isDemo === false && isoInRange(s.startedAt, range));
}

function snapshotSourceKey(source: string | null | undefined): string {
  const trimmed = (source ?? "").trim();
  return trimmed || "unattributed";
}

function eventTimes(events: TrafficEvent[], sessionId: string, name: string): number[] {
  return events
    .filter((e) => e.sessionId === sessionId && e.name === name)
    .map((e) => parseIso(e.occurredAt))
    .filter((t) => !Number.isNaN(t));
}

function hasStrictlyLater(earlier: number[], later: number[]): boolean {
  for (const e of earlier) {
    for (const l of later) {
      if (e < l) return true;
    }
  }
  return false;
}

function sessionsWithEvent(events: TrafficEvent[], name: string): Set<string> {
  const set = new Set<string>();
  for (const e of events) {
    if (e.name === name) set.add(e.sessionId);
  }
  return set;
}

export function trafficRangeAvailable(range: YmdRange, now: Date): boolean {
  const cutoff = karachiYmd(
    new Date(now.getTime() - RAW_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  );
  return range.start >= cutoff;
}

export function countCohortVisitors(sessions: TrafficSession[], range: YmdRange): number {
  const visitors = new Set<string>();
  for (const s of cohortSessions(sessions, range)) {
    visitors.add(s.visitorId);
  }
  return visitors.size;
}

export function buildSessionsBySource(
  sessions: TrafficSession[],
  range: YmdRange
): SessionsBySourceRow[] {
  const counts = new Map<string, number>();
  for (const s of cohortSessions(sessions, range)) {
    const source = (s.source ?? "").trim();
    if (!source) continue;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, sessionCount]) => ({ source, sessions: sessionCount }))
    .sort((a, b) => b.sessions - a.sessions || a.source.localeCompare(b.source));
}

export function buildLandingPages(sessions: TrafficSession[], range: YmdRange): LandingPageRow[] {
  const counts = new Map<string, number>();
  for (const s of cohortSessions(sessions, range)) {
    const path = (s.landingPath ?? "").trim();
    if (!path) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([path, sessionCount]) => ({ path, sessions: sessionCount }))
    .sort((a, b) => b.sessions - a.sessions || a.path.localeCompare(b.path));
}

export function buildDeliveredBySource(deliveredOrders: AttributedOrder[]): DeliveredBySourceRow[] {
  const groups = new Map<string, { orders: number; deliveredRevenue: number }>();
  for (const order of deliveredOrders) {
    const key = snapshotSourceKey(order.source);
    const row = groups.get(key) ?? { orders: 0, deliveredRevenue: 0 };
    row.orders += 1;
    row.deliveredRevenue +=
      typeof order.total === "number" && Number.isFinite(order.total) ? order.total : 0;
    groups.set(key, row);
  }
  return Array.from(groups.entries())
    .map(([source, row]) => ({ source, ...row }))
    .sort((a, b) => b.orders - a.orders || a.source.localeCompare(b.source));
}

export function buildShopFunnel(
  sessions: TrafficSession[],
  events: TrafficEvent[],
  orders: AttributedOrder[],
  range: YmdRange
): ShopFunnelStep[] {
  const cohort = cohortSessions(sessions, range);
  const cohortIds = new Set(cohort.map((s) => s.id));
  const cohortEvents = events.filter((e) => cohortIds.has(e.sessionId));
  const liveOrders = orders.filter((o) => o.isDemo !== true);

  const sessionCount = cohort.length;
  const pvReach = sessionsWithEvent(cohortEvents, "product_view");
  const atcReach = sessionsWithEvent(cohortEvents, "add_to_cart");
  const checkoutReach = sessionsWithEvent(cohortEvents, "checkout_started");

  const convertedReach = new Set<string>();
  for (const order of liveOrders) {
    if (order.sessionId && cohortIds.has(order.sessionId)) {
      convertedReach.add(order.sessionId);
    }
  }

  let pvThenAtc = 0;
  let atcThenCheckout = 0;
  let checkoutThenOrder = 0;

  for (const sessionId of Array.from(cohortIds)) {
    if (
      hasStrictlyLater(
        eventTimes(cohortEvents, sessionId, "product_view"),
        eventTimes(cohortEvents, sessionId, "add_to_cart")
      )
    ) {
      pvThenAtc += 1;
    }
    if (
      hasStrictlyLater(
        eventTimes(cohortEvents, sessionId, "add_to_cart"),
        eventTimes(cohortEvents, sessionId, "checkout_started")
      )
    ) {
      atcThenCheckout += 1;
    }
    const checkoutTimes = eventTimes(cohortEvents, sessionId, "checkout_started");
    const orderTimes = liveOrders
      .filter((o) => o.sessionId === sessionId)
      .map((o) => parseIso(o.createdAt))
      .filter((t) => !Number.isNaN(t));
    if (hasStrictlyLater(checkoutTimes, orderTimes)) {
      checkoutThenOrder += 1;
    }
  }

  return [
    {
      key: "sessions",
      label: "Sessions",
      count: sessionCount,
      conversionFromPrevious: null,
    },
    {
      key: "product_view",
      label: "Product view",
      count: pvReach.size,
      conversionFromPrevious: rate(pvReach.size, sessionCount),
    },
    {
      key: "add_to_cart",
      label: "Add to cart",
      count: atcReach.size,
      conversionFromPrevious: rate(pvThenAtc, pvReach.size),
    },
    {
      key: "checkout_started",
      label: "Checkout started",
      count: checkoutReach.size,
      conversionFromPrevious: rate(atcThenCheckout, atcReach.size),
    },
    {
      key: "converted",
      label: "Converted session",
      count: convertedReach.size,
      conversionFromPrevious: rate(checkoutThenOrder, checkoutReach.size),
    },
  ];
}
