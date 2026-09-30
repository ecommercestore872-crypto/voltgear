import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPostExListOrdersUrl,
  collectPostExOrderRows,
  fetchPostExListOrders,
  findPostExOrderByRefNumber,
  mapReconcileDbState,
  toSafePostExOrderSummary,
} from "./postex-reconcile";

describe("buildPostExListOrdersUrl", () => {
  it("builds get-all-order query with status and date range", () => {
    const url = buildPostExListOrdersUrl(
      { orderStatusID: 0, fromDate: "2026-09-30", toDate: "2026-09-30" },
      { POSTEX_API_BASE_URL: "https://api.postex.pk" },
    );
    assert.match(url, /get-all-order/);
    assert.match(url, /orderStatusID=0/);
    assert.match(url, /fromDate=2026-09-30/);
    assert.match(url, /toDate=2026-09-30/);
  });
});

describe("findPostExOrderByRefNumber", () => {
  it("finds a matching order in dist", () => {
    const body = {
      statusCode: "200",
      dist: [
        {
          orderRefNumber: "BNT-1031",
          trackingNumber: "PX-1",
          customerName: "Secret",
          customerPhone: "0300",
        },
        {
          orderRefNumber: "BNT-1032",
          trackingNumber: "PX-1032",
          transactionStatus: "Booked",
          transactionDate: "2026-09-30",
          invoicePayment: 1500,
        },
      ],
    };
    const row = findPostExOrderByRefNumber(body, "BNT-1032");
    assert.ok(row);
    const safe = toSafePostExOrderSummary(row!);
    assert.deepEqual(safe, {
      orderRefNumber: "BNT-1032",
      trackingNumber: "PX-1032",
      transactionStatus: "Booked",
      transactionDate: "2026-09-30",
      invoicePayment: 1500,
    });
    assert.equal("customerName" in safe, false);
    assert.equal(collectPostExOrderRows(body).length, 2);
  });

  it("returns null when PostEx succeeds but no ref matches", () => {
    const body = {
      statusCode: "200",
      dist: [{ orderRefNumber: "BNT-9999", trackingNumber: "PX-9" }],
    };
    assert.equal(findPostExOrderByRefNumber(body, "BNT-1032"), null);
  });
});

describe("fetchPostExListOrders", () => {
  it("returns upstream error fields without leaking token", async () => {
    let capturedHeaders: HeadersInit | undefined;
    const result = await fetchPostExListOrders(
      { orderStatusID: 0, fromDate: "2026-09-30", toDate: "2026-09-30" },
      {
        env: {
          POSTEX_API_BASE_URL: "https://api.postex.pk",
          POSTEX_API_TOKEN: "secret-token-value",
        },
        fetchImpl: async (_url, init) => {
          capturedHeaders = init?.headers;
          return new Response(
            JSON.stringify({ statusCode: "400", statusMessage: "Bad range" }),
            { status: 400 },
          );
        },
      },
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.statusCode, "400");
    assert.equal(result.statusMessage, "Bad range");
    assert.match(result.error, /Bad range/);
    assert.equal(JSON.stringify(result).includes("secret-token-value"), false);
    assert.equal(String((capturedHeaders as Record<string, string>)?.token), "secret-token-value");
  });

  it("does not include token in successful parsed payload path", async () => {
    const result = await fetchPostExListOrders(
      { orderStatusID: 0, fromDate: "2026-09-30", toDate: "2026-09-30" },
      {
        env: {
          POSTEX_API_BASE_URL: "https://api.postex.pk",
          POSTEX_API_TOKEN: "secret-token-value",
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              statusCode: "200",
              dist: [{ orderRefNumber: "BNT-1032", trackingNumber: "PX-1" }],
            }),
            { status: 200 },
          ),
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(JSON.stringify(result).includes("secret-token-value"), false);
    assert.equal(findPostExOrderByRefNumber(result.body, "BNT-1032")?.trackingNumber, "PX-1");
  });
});

describe("mapReconcileDbState", () => {
  it("maps DB columns to safe camelCase (read-only shape)", () => {
    const dbState = mapReconcileDbState({
      order_id: "BNT-1032",
      status: "new",
      postex_tracking_number: null,
      postex_booking_claimed_at: "2026-09-30T16:54:28.962+00:00",
      status_updated_at: null,
    });
    assert.deepEqual(dbState, {
      orderId: "BNT-1032",
      status: "new",
      postexTrackingNumber: null,
      postexBookingClaimedAt: "2026-09-30T16:54:28.962+00:00",
      statusUpdatedAt: null,
    });
  });
});

describe("reconcile write safety", () => {
  it("fetch uses GET and does not expose token in result JSON", async () => {
    let method = "";
    const result = await fetchPostExListOrders(
      { orderStatusID: 0, fromDate: "2026-09-30", toDate: "2026-09-30" },
      {
        env: { POSTEX_API_BASE_URL: "https://api.postex.pk", POSTEX_API_TOKEN: "tkn" },
        fetchImpl: async (_url, init) => {
          method = init?.method ?? "GET";
          return new Response(JSON.stringify({ statusCode: "200", dist: [] }), {
            status: 200,
          });
        },
      },
    );
    assert.equal(method, "GET");
    assert.equal(JSON.stringify(result).includes("tkn"), false);
  });
});
