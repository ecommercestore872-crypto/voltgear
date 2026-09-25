import {
  isoInRange,
  liveOrders,
  resolveAnalyticsRange,
  type AnalyticsOrder,
  type AnalyticsPreset,
  type YmdRange,
} from "@/lib/db/analytics-rules";

export type PurchaseSanityStatus = "ok" | "watch" | "warning" | "critical";

export type PurchaseSanityOrderRow = {
  orderId: string;
  createdAt: string;
  isDemo?: boolean;
  total?: number | null;
  attrib_ttclid?: string | null;
  attrib_fbclid?: string | null;
  attrib_source?: string | null;
  analytics_session_id?: string | null;
};

export type PurchaseSanityAttribution = {
  withTtclid: number;
  withFbclid: number;
  withSource: number;
  withSession: number;
};

export type ExternalPurchaseCheck = {
  channel: "tiktok" | "meta";
  externalPurchases: number | null;
  ratio: number | null;
  status: PurchaseSanityStatus;
  message: string;
};

export type PurchaseSanityReport = {
  preset: AnalyticsPreset;
  range: YmdRange;
  placedOrders: number;
  revenuePlacedPkr: number;
  attribution: PurchaseSanityAttribution;
  external: ExternalPurchaseCheck[];
  overallStatus: PurchaseSanityStatus;
};

/** Compare dashboard Purchase count to admin placed orders (Asia/Karachi range). */
export function evaluatePurchaseCoverage(input: {
  placedOrders: number;
  externalPurchases: number;
}): { status: PurchaseSanityStatus; ratio: number | null; message: string } {
  const { placedOrders, externalPurchases } = input;
  if (placedOrders <= 0 && externalPurchases <= 0) {
    return {
      status: "ok",
      ratio: null,
      message: "No placed orders in range.",
    };
  }
  if (placedOrders <= 0 && externalPurchases > 0) {
    return {
      status: "critical",
      ratio: null,
      message: "Purchase events reported but no admin orders in range — check date range or duplicates.",
    };
  }
  const ratio = externalPurchases / placedOrders;
  if (ratio > 1.15) {
    return {
      status: "critical",
      ratio,
      message: "More Purchase events than orders — likely duplicate firing or wrong date filter.",
    };
  }
  if (ratio < 0.2 && placedOrders >= 5) {
    return {
      status: "warning",
      ratio,
      message: "Very few Purchase events vs orders — check pixel/CAPI, consent, and ad blockers.",
    };
  }
  if (ratio < 0.45 && placedOrders >= 8) {
    return {
      status: "watch",
      ratio,
      message: "Purchase events below half of orders — normal with blockers; confirm trend is stable.",
    };
  }
  return {
    status: "ok",
    ratio,
    message: "Purchase volume is in a plausible range vs placed orders.",
  };
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function countAttribution(rows: PurchaseSanityOrderRow[]): PurchaseSanityAttribution {
  let withTtclid = 0;
  let withFbclid = 0;
  let withSource = 0;
  let withSession = 0;
  for (const row of rows) {
    if (hasText(row.attrib_ttclid)) withTtclid += 1;
    if (hasText(row.attrib_fbclid)) withFbclid += 1;
    if (hasText(row.attrib_source)) withSource += 1;
    if (hasText(row.analytics_session_id)) withSession += 1;
  }
  return { withTtclid, withFbclid, withSource, withSession };
}

export function ordersInRangeForPurchaseSanity(
  rows: PurchaseSanityOrderRow[],
  range: YmdRange,
): PurchaseSanityOrderRow[] {
  const asAnalytics: AnalyticsOrder[] = rows.map((r) => ({
    orderId: r.orderId,
    createdAt: r.createdAt,
    isDemo: r.isDemo,
    total: r.total,
  }));
  const live = liveOrders(asAnalytics);
  const liveIds = new Set(live.map((o) => o.orderId));
  return rows.filter((r) => liveIds.has(r.orderId) && isoInRange(r.createdAt, range));
}

export function buildPurchaseSanityReport(input: {
  preset: AnalyticsPreset;
  rows: PurchaseSanityOrderRow[];
  now?: Date;
  tiktokPurchases?: number | null;
  metaPurchases?: number | null;
}): PurchaseSanityReport {
  const range = resolveAnalyticsRange(input.preset, input.now);
  const inRange = ordersInRangeForPurchaseSanity(input.rows, range);
  const placedOrders = inRange.length;
  const revenuePlacedPkr = inRange.reduce(
    (sum, r) => sum + (typeof r.total === "number" && Number.isFinite(r.total) ? r.total : 0),
    0,
  );
  const attribution = countAttribution(inRange);

  const external: ExternalPurchaseCheck[] = [];
  for (const [channel, count] of [
    ["tiktok", input.tiktokPurchases],
    ["meta", input.metaPurchases],
  ] as const) {
    const externalPurchases =
      typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : null;
    if (externalPurchases == null) {
      external.push({
        channel,
        externalPurchases: null,
        ratio: null,
        status: "watch",
        message: `Enter ${channel} Purchase count from Ads Manager (see docs).`,
      });
      continue;
    }
    const evalResult = evaluatePurchaseCoverage({ placedOrders, externalPurchases });
    external.push({
      channel,
      externalPurchases,
      ratio: evalResult.ratio,
      status: evalResult.status,
      message: evalResult.message,
    });
  }

  const statusRank: Record<PurchaseSanityStatus, number> = {
    ok: 0,
    watch: 1,
    warning: 2,
    critical: 3,
  };
  const overallStatus = external.reduce<PurchaseSanityStatus>(
    (worst, row) => (statusRank[row.status] > statusRank[worst] ? row.status : worst),
    "ok",
  );

  return {
    preset: input.preset,
    range,
    placedOrders,
    revenuePlacedPkr,
    attribution,
    external,
    overallStatus,
  };
}
