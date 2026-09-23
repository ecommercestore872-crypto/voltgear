import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addDaysYmd, karachiYmd } from "./analytics-rules";
import {
  RAW_RETENTION_DAYS,
  buildDeliveredBySource,
  buildLandingPages,
  buildSessionsBySource,
  buildShopFunnel,
  countCohortVisitors,
  trafficRangeAvailable,
  type AttributedOrder,
  type TrafficEvent,
  type TrafficSession,
} from "./analytics-traffic-rules";

const RANGE = { start: "2026-08-20", end: "2026-08-27" };
const NOW = new Date("2026-08-28T07:00:00.000Z"); // 2026-08-28 in Karachi

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

describe("RAW_RETENTION_DAYS", () => {
  it("is 90", () => {
    assert.equal(RAW_RETENTION_DAYS, 90);
  });
});

describe("trafficRangeAvailable", () => {
  it("is false when range starts on day 91 before now", () => {
    const today = karachiYmd(NOW);
    const day91 = addDaysYmd(today, -91);
    assert.equal(trafficRangeAvailable({ start: day91, end: today }, NOW), false);
  });

  it("is true when range starts on day 90 before now", () => {
    const today = karachiYmd(NOW);
    const day90 = addDaysYmd(today, -90);
    assert.equal(trafficRangeAvailable({ start: day90, end: today }, NOW), true);
  });
});

describe("countCohortVisitors", () => {
  it("counts distinct visitor ids from cohort sessions, not a visitors table length", () => {
    const sessions = [
      session({ id: "s1", visitorId: "v1", startedAt: "2026-08-25T10:00:00.000Z" }),
      session({ id: "s2", visitorId: "v1", startedAt: "2026-08-26T10:00:00.000Z" }),
      session({ id: "s3", visitorId: "v2", startedAt: "2026-08-26T11:00:00.000Z" }),
      session({
        id: "s-demo",
        visitorId: "v-demo",
        startedAt: "2026-08-26T12:00:00.000Z",
        isDemo: true,
      }),
      session({ id: "s-old", visitorId: "v-old", startedAt: "2026-08-01T10:00:00.000Z" }),
    ];
    assert.equal(countCohortVisitors(sessions, RANGE), 2);
  });
});

describe("buildSessionsBySource", () => {
  it("keeps direct session source as direct", () => {
    const sessions = [
      session({
        id: "s1",
        visitorId: "v1",
        startedAt: "2026-08-25T10:00:00.000Z",
        source: "direct",
      }),
      session({
        id: "s2",
        visitorId: "v2",
        startedAt: "2026-08-26T10:00:00.000Z",
        source: "tiktok",
      }),
    ];
    const rows = buildSessionsBySource(sessions, RANGE);
    const direct = rows.find((r) => r.source === "direct");
    assert.ok(direct);
    assert.equal(direct.sessions, 1);
  });
});

describe("buildLandingPages", () => {
  it("groups cohort landingPath, skips empty, and sorts like bySource", () => {
    const sessions = [
      session({
        id: "s1",
        visitorId: "v1",
        startedAt: "2026-08-25T10:00:00.000Z",
        landingPath: "/product/pad",
      }),
      session({
        id: "s2",
        visitorId: "v2",
        startedAt: "2026-08-26T10:00:00.000Z",
        landingPath: "/product/pad",
      }),
      session({
        id: "s3",
        visitorId: "v3",
        startedAt: "2026-08-26T11:00:00.000Z",
        landingPath: "/products",
      }),
      session({
        id: "s-empty",
        visitorId: "v4",
        startedAt: "2026-08-26T12:00:00.000Z",
        landingPath: "",
      }),
      session({
        id: "s-null",
        visitorId: "v5",
        startedAt: "2026-08-26T13:00:00.000Z",
        landingPath: null,
      }),
      session({
        id: "s-demo",
        visitorId: "v6",
        startedAt: "2026-08-26T14:00:00.000Z",
        landingPath: "/product/pad",
        isDemo: true,
      }),
      session({
        id: "s-old",
        visitorId: "v7",
        startedAt: "2026-08-01T10:00:00.000Z",
        landingPath: "/old",
      }),
    ];
    const rows = buildLandingPages(sessions, RANGE);
    assert.deepEqual(rows, [
      { path: "/product/pad", sessions: 2 },
      { path: "/products", sessions: 1 },
    ]);
  });
});

describe("buildDeliveredBySource", () => {
  it("maps null or empty snapshot source to unattributed, not direct", () => {
    const orders: AttributedOrder[] = [
      { orderId: "o1", createdAt: "2026-08-25T10:00:00.000Z", sessionId: null, source: null },
      { orderId: "o2", createdAt: "2026-08-25T11:00:00.000Z", sessionId: "s1", source: "" },
      {
        orderId: "o3",
        createdAt: "2026-08-25T12:00:00.000Z",
        sessionId: "s2",
        source: "direct",
        total: 1000,
      },
    ];
    const rows = buildDeliveredBySource(orders);
    const unattributed = rows.find((r) => r.source === "unattributed");
    const direct = rows.find((r) => r.source === "direct");
    assert.ok(unattributed);
    assert.equal(unattributed.orders, 2);
    assert.equal(unattributed.deliveredRevenue, 0);
    assert.ok(direct);
    assert.equal(direct.orders, 1);
    assert.equal(direct.deliveredRevenue, 1000);
    assert.equal(rows.find((r) => r.source === "direct" && r.orders === 3), undefined);
  });
});

describe("buildShopFunnel", () => {
  it("excludes demo sessions from cohort reach", () => {
    const sessions = [
      session({ id: "live", visitorId: "v1", startedAt: "2026-08-25T10:00:00.000Z" }),
      session({
        id: "demo",
        visitorId: "v2",
        startedAt: "2026-08-25T11:00:00.000Z",
        isDemo: true,
      }),
    ];
    const funnel = buildShopFunnel(sessions, [], [], RANGE);
    assert.equal(funnel[0]?.count, 1);
    assert.equal(funnel[0]?.key, "sessions");
  });

  it("allows ATC reach to exceed PV reach while transition rate stays <= 1", () => {
    const sessions = [
      session({ id: "s-atc-only", visitorId: "v1", startedAt: "2026-08-25T10:00:00.000Z" }),
      session({ id: "s-pv-atc", visitorId: "v2", startedAt: "2026-08-25T10:00:00.000Z" }),
    ];
    const events = [
      event({
        sessionId: "s-atc-only",
        name: "add_to_cart",
        occurredAt: "2026-08-25T10:01:00.000Z",
      }),
      event({
        sessionId: "s-pv-atc",
        name: "product_view",
        occurredAt: "2026-08-25T10:01:00.000Z",
      }),
      event({
        sessionId: "s-pv-atc",
        name: "add_to_cart",
        occurredAt: "2026-08-25T10:02:00.000Z",
      }),
    ];
    const funnel = buildShopFunnel(sessions, events, [], RANGE);
    const pv = funnel.find((s) => s.key === "product_view")!;
    const atc = funnel.find((s) => s.key === "add_to_cart")!;
    assert.equal(pv.count, 1);
    assert.equal(atc.count, 2);
    assert.ok(atc.conversionFromPrevious != null);
    assert.ok(atc.conversionFromPrevious! <= 1);
    assert.equal(atc.conversionFromPrevious, 1);
  });

  it("counts checkout only when ATC occurred strictly before checkout_started", () => {
    const sessions = [
      session({ id: "s-good", visitorId: "v1", startedAt: "2026-08-25T10:00:00.000Z" }),
      session({ id: "s-reverse", visitorId: "v2", startedAt: "2026-08-25T10:00:00.000Z" }),
    ];
    const events = [
      event({
        sessionId: "s-good",
        name: "add_to_cart",
        occurredAt: "2026-08-25T10:01:00.000Z",
      }),
      event({
        sessionId: "s-good",
        name: "checkout_started",
        occurredAt: "2026-08-25T10:02:00.000Z",
      }),
      event({
        sessionId: "s-reverse",
        name: "checkout_started",
        occurredAt: "2026-08-25T10:01:00.000Z",
      }),
      event({
        sessionId: "s-reverse",
        name: "add_to_cart",
        occurredAt: "2026-08-25T10:02:00.000Z",
      }),
    ];
    const funnel = buildShopFunnel(sessions, events, [], RANGE);
    const checkout = funnel.find((s) => s.key === "checkout_started")!;
    assert.equal(checkout.count, 2);
    assert.equal(checkout.conversionFromPrevious, 0.5);
  });

  it("uses null conversionFromPrevious on Sessions and keeps all rates <= 1", () => {
    const sessions = [
      session({ id: "s1", visitorId: "v1", startedAt: "2026-08-25T10:00:00.000Z" }),
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
    const orders: AttributedOrder[] = [
      {
        orderId: "o1",
        createdAt: "2026-08-25T10:04:00.000Z",
        sessionId: "s1",
        source: "direct",
      },
    ];
    const funnel = buildShopFunnel(sessions, events, orders, RANGE);
    assert.equal(funnel[0]?.conversionFromPrevious, null);
    for (const step of funnel) {
      if (step.conversionFromPrevious != null) {
        assert.ok(step.conversionFromPrevious <= 1);
      }
    }
    const converted = funnel.find((s) => s.key === "converted")!;
    assert.equal(converted.count, 1);
    assert.equal(converted.conversionFromPrevious, 1);
  });
});
