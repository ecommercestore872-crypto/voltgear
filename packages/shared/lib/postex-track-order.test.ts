import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolvePostExTrackOrderUrl } from "@/lib/postex";

import type { Order } from "@/lib/types";

import {
  fetchPostExTrackOrderFromApi,
  mapPostExTrackBodyToSafeResponse,
  runPostExTrackOrderForOrderId,
} from "./postex-track-order";

const orderWithTracking = (): Order => ({
  _id: "uuid-1",
  orderId: "BNT-1032",
  createdAt: "2026-09-30T00:00:00.000Z",
  total: 6499,
  status: "processing",
  postexTrackingNumber: "23736240000001",
  customer: {
    name: "Secret Customer",
    phone: "03001234567",
    email: "secret@example.com",
    address: "Secret Address",
    city: "Lahore",
  },
  items: [{ name: "Widget", quantity: 1 }],
});

describe("resolvePostExTrackOrderUrl", () => {
  it("uses the integration track-order path under the host base", () => {
    assert.equal(
      resolvePostExTrackOrderUrl("23736240000001", {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
      }),
      "https://api.postex.pk/services/integration/api/order/v1/track-order/23736240000001",
    );
  });
});

describe("mapPostExTrackBodyToSafeResponse", () => {
  it("returns only safe tracking fields and strips customer PII from dist", () => {
    const mapped = mapPostExTrackBodyToSafeResponse("BNT-1032", "23736240000001", {
      statusCode: "200",
      dist: {
        customerName: "Secret Customer",
        customerPhone: "03001234567",
        customerEmail: "secret@example.com",
        deliveryAddress: "Secret Address",
        transactionStatus: "Unbooked",
        orderPickupDate: "2026-10-01",
        orderDeliveryDate: null,
        transactionDate: "2026-09-30",
        transactionStatusHistory: [
          {
            transactionStatusMessage: "Order Created",
            transactionStatusMessageCode: "001",
            internalOnly: "x",
          },
        ],
      },
    });

    assert.equal("ok" in mapped, false);
    if ("ok" in mapped) return;

    assert.equal(mapped.success, true);
    assert.equal(mapped.orderId, "BNT-1032");
    assert.equal(mapped.trackingNumber, "23736240000001");
    assert.equal(mapped.transactionStatus, "Unbooked");
    assert.deepEqual(mapped.transactionStatusHistory, [
      {
        transactionStatusMessage: "Order Created",
        transactionStatusMessageCode: "001",
      },
    ]);

    const serialized = JSON.stringify(mapped);
    assert.equal(serialized.includes("Secret Customer"), false);
    assert.equal(serialized.includes("03001234567"), false);
    assert.equal(serialized.includes("secret@example.com"), false);
    assert.equal(serialized.includes("Secret Address"), false);
  });
});

describe("fetchPostExTrackOrderFromApi", () => {
  it("GETs track-order with token header and parses valid JSON", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const result = await fetchPostExTrackOrderFromApi("23736240000001", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "merchant-token-secret",
      },
      fetchImpl: async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = Object.fromEntries(
          new Headers(init?.headers as HeadersInit).entries(),
        );
        return new Response(
          JSON.stringify({
            statusCode: "200",
            dist: {
              transactionStatus: "Unbooked",
              orderPickupDate: null,
              orderDeliveryDate: null,
              transactionDate: "2026-09-30",
              transactionStatusHistory: [],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    assert.equal(result.ok, true);
    assert.equal(
      capturedUrl,
      "https://api.postex.pk/services/integration/api/order/v1/track-order/23736240000001",
    );
    assert.equal(capturedHeaders.token, "merchant-token-secret");

    assert.equal(JSON.stringify(result).includes("merchant-token-secret"), false);
  });

  it("returns safe error for non-JSON PostEx response", async () => {
    const result = await fetchPostExTrackOrderFromApi("23736240000001", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "token",
      },
      fetchImpl: async () =>
        new Response("<html>error</html>", {
          status: 502,
          headers: { "content-type": "text/html" },
        }),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "PostEx returned a non-JSON response");
    assert.equal(result.httpStatus, 502);
    assert.equal(JSON.stringify(result).includes("<html>"), false);
  });

  it("surfaces PostEx business errors", async () => {
    const result = await fetchPostExTrackOrderFromApi("23736240000001", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "token",
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            statusCode: "400",
            statusMessage: "Invalid tracking number",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "Invalid tracking number");
  });
});

describe("runPostExTrackOrderForOrderId", () => {
  it("returns 400 when order has no PostEx tracking number", async () => {
    let fetchCalls = 0;
    const result = await runPostExTrackOrderForOrderId("BNT-9999", {
      getOrder: async () => ({
        ...orderWithTracking(),
        orderId: "BNT-9999",
        postexTrackingNumber: undefined,
      }),
      fetchTrack: async () => {
        fetchCalls++;
        return { ok: true, data: {}, upstreamHttpStatus: 200 };
      },
    });

    assert.equal(result.status, 400);
    assert.equal(result.body.error, "This order has no PostEx tracking number yet.");
    assert.equal(fetchCalls, 0);
  });

  it("returns safe tracking payload on success without DB writes", async () => {
    let getOrderCalls = 0;

    const result = await runPostExTrackOrderForOrderId("BNT-1032", {
      getOrder: async (id) => {
        getOrderCalls++;
        assert.equal(id, "BNT-1032");
        return orderWithTracking();
      },
      fetchTrack: async (tn) => {
        assert.equal(tn, "23736240000001");
        return {
          ok: true,
          upstreamHttpStatus: 200,
          data: {
            statusCode: "200",
            dist: {
              customerName: "Secret Customer",
              transactionStatus: "Unbooked",
              orderPickupDate: "2026-10-01",
              orderDeliveryDate: null,
              transactionDate: "2026-09-30",
              transactionStatusHistory: [
                {
                  transactionStatusMessage: "Shipment created",
                  transactionStatusMessageCode: "SC",
                },
              ],
            },
          },
        };
      },
    });

    assert.equal(getOrderCalls, 1);
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assert.equal(result.body.orderId, "BNT-1032");
    assert.equal(result.body.trackingNumber, "23736240000001");
    assert.equal(result.body.transactionStatus, "Unbooked");

    const bodyJson = JSON.stringify(result.body);
    assert.equal(bodyJson.includes("Secret Customer"), false);
    assert.equal(bodyJson.includes("merchant-token"), false);
  });
});
