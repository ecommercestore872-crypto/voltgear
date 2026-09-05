import {
  ANALYTICS_PRESETS,
  drillOrdersByIds,
  parseAnalyticsQuery,
  resolveAnalyticsRange,
  runAnalyticsQuery,
  type AnalyticsPreset,
  type AnalyticsQuery,
  type DrillOrder,
} from "@/lib/db/analytics-rules";
import { assembleAnalyticsBundle, type BundleOrder } from "@/lib/db/analytics-bundle-rules";
import type { TrafficEvent, TrafficSession } from "@/lib/db/analytics-traffic-rules";
import { fetchProductCoachCatalog, fetchProductCostRows, getAdminSettings, getAnalyticsAdSpend } from "@/lib/db/admin-store";
import { parseAdSpendStore, spendForRange } from "@/lib/db/analytics-profit-rules";
import { getAllOrders } from "@/lib/order-store";
import { getServiceClient } from "@/lib/supabase/server";

const PAGE_SIZE = 1000;

export function parseAnalyticsPreset(raw: string | null | undefined): AnalyticsPreset {
  return ANALYTICS_PRESETS.includes(raw as AnalyticsPreset) ? (raw as AnalyticsPreset) : "last30";
}

export function sanitizeDrillOrders(rows: DrillOrder[]): DrillOrder[] {
  return rows.map((r) => ({
    orderId: r.orderId,
    createdAt: r.createdAt,
    status: r.status,
    total: r.total,
    city: r.city,
  }));
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value);
  return text || null;
}

async function fetchLiveSessionRows(): Promise<Record<string, unknown>[]> {
  const db = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("analytics_sessions")
      .select("id, visitor_id, started_at, is_demo, source, landing_path")
      .eq("is_demo", false)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) return [];
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchLiveEventRows(): Promise<Record<string, unknown>[]> {
  const db = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  let select = "session_id, name, occurred_at, properties, product_slug, path";
  for (;;) {
    const { data, error } = await db
      .from("analytics_events")
      .select(select)
      .eq("is_demo", false)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (from === 0 && select.includes("product_slug")) {
        select = "session_id, name, occurred_at, properties";
        continue;
      }
      return [];
    }
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchOrderAttribRows(): Promise<Record<string, unknown>[]> {
  const db = getServiceClient();
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("orders")
      .select("order_id, analytics_session_id, attrib_source")
      .order("order_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) return [];
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function loadFirstPartyTraffic(): Promise<{
  sessions: TrafficSession[];
  events: TrafficEvent[];
  attribByOrderId: Map<string, { sessionId: string | null; source: string | null }>;
}> {
  try {
    const [sessionRows, eventRows, attribRows] = await Promise.all([
      fetchLiveSessionRows(),
      fetchLiveEventRows(),
      fetchOrderAttribRows(),
    ]);

    const sessions: TrafficSession[] = sessionRows.map((row) => ({
      id: String(row.id),
      visitorId: String(row.visitor_id),
      startedAt: String(row.started_at),
      isDemo: row.is_demo === true,
      source: asText(row.source),
      landingPath: asText(row.landing_path),
    }));

    const events: TrafficEvent[] = eventRows.map((row) => ({
      sessionId: String(row.session_id),
      name: String(row.name),
      occurredAt: String(row.occurred_at),
      productSlug: asText(row.product_slug),
      path: asText(row.path),
      properties:
        row.properties && typeof row.properties === "object" && !Array.isArray(row.properties)
          ? (row.properties as Record<string, unknown>)
          : undefined,
    }));

    const attribByOrderId = new Map<string, { sessionId: string | null; source: string | null }>();
    for (const row of attribRows) {
      attribByOrderId.set(String(row.order_id), {
        sessionId: asText(row.analytics_session_id),
        source: asText(row.attrib_source),
      });
    }

    return { sessions, events, attribByOrderId };
  } catch {
    return { sessions: [], events: [], attribByOrderId: new Map() };
  }
}

export async function loadAnalyticsBundle(input: {
  preset: string;
  from?: string;
  to?: string;
}) {
  const preset = parseAnalyticsPreset(input.preset);
  const now = new Date();
  const [orders, costs, traffic, spendStore, catalog, settings] = await Promise.all([
    getAllOrders(),
    fetchProductCostRows(),
    loadFirstPartyTraffic(),
    getAnalyticsAdSpend().catch(() => parseAdSpendStore({})),
    fetchProductCoachCatalog().catch(() => []),
    getAdminSettings().catch(() => null),
  ]);
  const range = resolveAnalyticsRange(preset, now, { from: input.from, to: input.to });
  const bundleOrders: BundleOrder[] = orders.map((order) => {
    const attrib = traffic.attribByOrderId.get(order.orderId);
    return {
      ...order,
      sessionId: attrib?.sessionId ?? null,
      source: attrib?.source ?? null,
    };
  });
  const shippingFee =
    settings && typeof settings === "object" && "shipping_fee" in settings
      ? Number((settings as { shipping_fee?: unknown }).shipping_fee) || 0
      : 0;
  const freeShippingThreshold =
    settings && typeof settings === "object" && "free_shipping_threshold" in settings
      ? Number((settings as { free_shipping_threshold?: unknown }).free_shipping_threshold) || 0
      : 0;
  return assembleAnalyticsBundle({
    now,
    range,
    orders: bundleOrders,
    costs,
    sessions: traffic.sessions,
    events: traffic.events,
    spend: spendForRange(spendStore, range),
    catalog,
    shippingFee,
    freeShippingThreshold,
    packingFee: spendStore.packingFee,
    codFee: spendStore.codFee,
  });
}

export async function runSafeAnalyticsQuery(raw: unknown) {
  const parsed = parseAnalyticsQuery(raw);
  if (!parsed.ok) return parsed;
  const [orders, costs, traffic] = await Promise.all([
    getAllOrders(),
    fetchProductCostRows(),
    loadFirstPartyTraffic(),
  ]);
  const withSource = orders.map((order) => {
    const attrib = traffic.attribByOrderId.get(order.orderId);
    return { ...order, source: attrib?.source ?? null };
  });
  return { ok: true as const, rows: runAnalyticsQuery(parsed.query, withSource, costs) };
}

export async function loadAnalyticsDrilldown(ids: string[]) {
  const orders = await getAllOrders();
  return drillOrdersByIds(orders, ids.slice(0, 100));
}

export type { AnalyticsQuery };
export type { AnalyticsBundle } from "@/lib/db/analytics-bundle-rules";
