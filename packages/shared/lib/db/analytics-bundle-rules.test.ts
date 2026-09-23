import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDaysYmd, karachiYmd, type AnalyticsOrder } from "./analytics-rules";
import { assembleAnalyticsBundle, type BundleOrder } from "./analytics-bundle-rules";
import {
  trafficRangeAvailable,
  type TrafficEvent,
  type TrafficSession,
} from "./analytics-traffic-rules";

const NOW = new Date("2026-08-28T07:00:00.000Z");
const RANGE = { start: "2026-08-20", end: "2026-08-27" };
const noon = (ymd: string) => `${ymd}T07:00:00.000Z`;

function session(
  partial: Partial<TrafficSession> & Pick<TrafficSession, "id" | "visitorId" | "startedAt">
): TrafficSession {
  return {
    isDemo: false,
    source: null,
    landingPath: null,
    ...partial,
  };
}

function event(
  partial: Partial<TrafficEvent> & Pick<TrafficEvent, "sessionId" | "name" | "occurredAt">
): TrafficEvent {
  return { ...partial };
}

function order(
  partial: Partial<BundleOrder> & Pick<BundleOrder, "orderId" | "createdAt">
): BundleOrder {
  return {
    status: "new",
    total: 1000,
    items: [{ slug: "watch", name: "Watch", price: 1000, quantity: 1, lineTotal: 1000 }],
    customer: { email: "a@example.com", city: "Lahore" },
    sessionId: null,
    source: null,
    ...partial,
  };
}

const SHOP_INSIGHT_IDS = [
  "shop_drop_product_view",
  "shop_drop_add_to_cart",
  "shop_drop_checkout",
  "shop_drop_convert",
  "source_underperforms",
  "landing_low_pdp",
  "checkout_validation_hotspot",
];

describe("assembleAnalyticsBundle", () => {
  it("nulls traffic and shop funnel outside retention, keeps deliveredBySource, fulfillment-only insights", () => {
    const today = karachiYmd(NOW);
    const range = { start: addDaysYmd(today, -120), end: addDaysYmd(today, -100) };
    assert.equal(trafficRangeAvailable(range, NOW), false);

    const delivered: BundleOrder = order({
      orderId: "VG-DEL",
      createdAt: noon(addDaysYmd(range.start, -10)),
      status: "delivered",
      statusUpdatedAt: noon(range.start),
      statusHistory: [{ status: "delivered", at: noon(range.start) }],
      total: 2500,
      sessionId: "s-old",
      source: "tiktok",
    });

    const maturePlaced: AnalyticsOrder[] = Array.from({ length: 12 }, (_, i) =>
      order({
        orderId: `VG-M${i}`,
        createdAt: noon(range.start),
        status: "new",
      })
    );

    const sessions = [
      session({
        id: "s-old",
        visitorId: "v-old",
        startedAt: noon(range.start),
        source: "tiktok",
        landingPath: "/product/pad",
      }),
    ];

    const bundle = assembleAnalyticsBundle({
      now: NOW,
      range,
      orders: [delivered, ...maturePlaced],
      costs: [],
      sessions,
      events: [],
    });

    assert.equal(bundle.traffic.available, false);
    assert.equal(bundle.traffic.visitors, null);
    assert.equal(bundle.traffic.sessions, null);
    assert.equal(bundle.traffic.convertedSessions, null);
    assert.equal(bundle.traffic.bySource, null);
    assert.equal(bundle.traffic.landingPages, null);
    assert.equal(bundle.shopFunnel, null);
    assert.equal(bundle.retentionNotice, true);
    assert.equal("webFunnel" in bundle, false);

    const tiktok = bundle.traffic.deliveredBySource.find((r) => r.source === "tiktok");
    assert.ok(tiktok);
    assert.equal(tiktok.orders, 1);
    assert.equal(tiktok.deliveredRevenue, 2500);

    assert.equal(
      bundle.insights.some((c) => SHOP_INSIGHT_IDS.includes(c.id)),
      false
    );
    assert.ok(bundle.insights.some((c) => c.id === "fulfillment_processing_gap"));
    assert.ok(bundle.funnel.length > 0);
    assert.equal(bundle.executive.deliveredRevenue, 2500);
    assert.equal(bundle.moneyStory.kept, 0);
    assert.ok(Array.isArray(bundle.alerts));
    assert.ok(Array.isArray(bundle.coach.products));
  });

  it("fills visitors, sessions, converted, bySource, landingPages, and shopFunnel when traffic is available", () => {
    assert.equal(trafficRangeAvailable(RANGE, NOW), true);

    const sessions = [
      session({
        id: "s1",
        visitorId: "v1",
        startedAt: "2026-08-25T10:00:00.000Z",
        source: "tiktok",
        landingPath: "/product/pad",
      }),
      session({
        id: "s2",
        visitorId: "v1",
        startedAt: "2026-08-26T10:00:00.000Z",
        source: "direct",
        landingPath: "/products",
      }),
      session({
        id: "s3",
        visitorId: "v2",
        startedAt: "2026-08-26T11:00:00.000Z",
        source: "tiktok",
        landingPath: "/product/pad",
      }),
    ];
    const events = [
      event({
        sessionId: "s1",
        name: "product_view",
        occurredAt: "2026-08-25T10:01:00.000Z",
      }),
      event({
        sessionId: "s1",
        name: "add_to_cart",
        occurredAt: "2026-08-25T10:02:00.000Z",
      }),
      event({
        sessionId: "s1",
        name: "checkout_started",
        occurredAt: "2026-08-25T10:03:00.000Z",
      }),
    ];
    const orders: BundleOrder[] = [
      order({
        orderId: "VG-1",
        createdAt: "2026-08-25T10:04:00.000Z",
        status: "delivered",
        statusUpdatedAt: "2026-08-26T10:00:00.000Z",
        statusHistory: [{ status: "delivered", at: "2026-08-26T10:00:00.000Z" }],
        total: 1800,
        sessionId: "s1",
        source: "tiktok",
      }),
    ];

    const bundle = assembleAnalyticsBundle({
      now: NOW,
      range: RANGE,
      orders,
      costs: [],
      sessions,
      events,
    });

    assert.equal(bundle.traffic.available, true);
    assert.equal(bundle.traffic.visitors, 2);
    assert.equal(bundle.traffic.sessions, 3);
    assert.equal(bundle.traffic.convertedSessions, 1);
    assert.equal(bundle.retentionNotice, false);
    assert.ok(bundle.shopFunnel);
    const converted = bundle.shopFunnel.find((s) => s.key === "converted");
    assert.equal(converted?.count, 1);
    assert.equal(bundle.traffic.convertedSessions, converted?.count);

    const bySource = bundle.traffic.bySource ?? [];
    assert.equal(bySource.find((r) => r.source === "tiktok")?.sessions, 2);
    assert.equal(bySource.find((r) => r.source === "direct")?.sessions, 1);

    const landings = bundle.traffic.landingPages ?? [];
    assert.equal(landings.find((r) => r.path === "/product/pad")?.sessions, 2);
    assert.equal(landings.find((r) => r.path === "/products")?.sessions, 1);

    const deliveredTiktok = bundle.traffic.deliveredBySource.find((r) => r.source === "tiktok");
    assert.ok(deliveredTiktok);
    assert.equal(deliveredTiktok.orders, 1);
    assert.equal(deliveredTiktok.deliveredRevenue, 1800);
  });
});
