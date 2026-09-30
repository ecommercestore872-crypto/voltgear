import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPostExOrder,
  readPostExJsonResponse,
  resolvePostExCreateOrderUrl,
  type PostExOrderPayload,
} from "./postex";

const samplePayload = (): PostExOrderPayload => ({
  orderRefNumber: "BNT-1032",
  invoicePayment: 1500,
  customerName: "Customer",
  customerPhone: "03001234567",
  deliveryAddress: "House 1",
  cityName: "Lahore",
  pickupAddressCode: "001",
  orderDetail: "Item x1",
  items: 1,
});

describe("resolvePostExCreateOrderUrl", () => {
  it("uses the integration create-order path under the host base", () => {
    assert.equal(
      resolvePostExCreateOrderUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk" }),
      "https://api.postex.pk/services/integration/api/order/v3/create-order",
    );
  });

  it("strips a trailing slash on the host base", () => {
    assert.equal(
      resolvePostExCreateOrderUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk/" }),
      "https://api.postex.pk/services/integration/api/order/v3/create-order",
    );
  });
});

describe("readPostExJsonResponse", () => {
  it("returns safe error for HTML without throwing", async () => {
    const res = new Response("<html><body>Not Found</body></html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    });
    const parsed = await readPostExJsonResponse(res);
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.error, "PostEx returned a non-JSON response");
    assert.equal(parsed.upstreamHttpStatus, 404);
    assert.equal(JSON.stringify(parsed).includes("<html>"), false);
  });
});

describe("createPostExOrder", () => {
  it("POSTs to the correct URL and sends token header", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const result = await createPostExOrder(samplePayload(), {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "merchant-token",
      },
      fetchImpl: async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = Object.fromEntries(
          new Headers(init?.headers as HeadersInit).entries(),
        );
        return new Response(
          JSON.stringify({
            statusCode: "200",
            statusMessage: "ORDER HAS BEEN CREATED",
            dist: { trackingNumber: "CX-12345678901", orderStatus: "UnBooked" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    assert.equal(
      capturedUrl,
      "https://api.postex.pk/services/integration/api/order/v3/create-order",
    );
    assert.equal(capturedHeaders.token, "merchant-token");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.trackingNumber, "CX-12345678901");
  });

  it("returns PostEx JSON business error safely", async () => {
    const result = await createPostExOrder(samplePayload(), {
      env: { POSTEX_API_BASE_URL: "https://api.postex.pk", POSTEX_API_TOKEN: "t" },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            statusCode: "400",
            statusMessage: "Invalid city name",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "Invalid city name");
    assert.equal(result.upstreamHttpStatus, 200);
  });

  it("handles non-JSON upstream response without SyntaxError", async () => {
    const result = await createPostExOrder(samplePayload(), {
      env: { POSTEX_API_BASE_URL: "https://api.postex.pk", POSTEX_API_TOKEN: "t" },
      fetchImpl: async () =>
        new Response("<html><h1>404</h1></html>", {
          status: 404,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "PostEx returned a non-JSON response");
    assert.equal(result.upstreamHttpStatus, 404);
    assert.equal(String(result.error).includes("SyntaxError"), false);
    assert.equal(JSON.stringify(result).includes("<html>"), false);
  });
});
