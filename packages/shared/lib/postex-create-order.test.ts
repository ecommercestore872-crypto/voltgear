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
    assert.match(result.error, /reconcile before retrying/i);
    assert.equal(result.failureKind, "unknown");
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
    assert.equal(result.failureKind, "unknown");
    assert.equal(result.upstreamHttpStatus, 404);
    assert.equal(String(result.error).includes("SyntaxError"), false);
    assert.equal(JSON.stringify(result).includes("<html>"), false);
  });

  it("does not send incomplete pickup, city, or COD data", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => { calls++; throw new Error("should not send"); };
    for (const payload of [
      { ...samplePayload(), pickupAddressCode: undefined },
      { ...samplePayload(), cityName: "" },
      { ...samplePayload(), invoicePayment: 1500.5 },
    ]) {
      const result = await createPostExOrder(payload, {
        env: { POSTEX_API_TOKEN: "merchant-token" }, fetchImpl,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.failureKind, "definitive");
    }
    assert.equal(calls, 0);
  });

  it("keeps transport and provider outage outcomes unknown without leaking exceptions", async () => {
    const env = { POSTEX_API_TOKEN: "merchant-token" };
    const thrown = await createPostExOrder(samplePayload(), {
      env,
      fetchImpl: async () => { throw new Error("merchant-token customer phone 03001234567"); },
    });
    assert.equal(thrown.ok, false);
    if (thrown.ok) return;
    assert.equal(thrown.failureKind, "unknown");
    assert.equal(JSON.stringify(thrown).includes("03001234567"), false);
    assert.equal(JSON.stringify(thrown).includes("merchant-token"), false);

    const outage = await createPostExOrder(samplePayload(), {
      env,
      fetchImpl: async () => new Response(JSON.stringify({ statusCode: "500" }), {
        status: 500, headers: { "content-type": "application/json" },
      }),
    });
    assert.equal(outage.ok, false);
    if (!outage.ok) assert.equal(outage.failureKind, "unknown");
  });

  it("sets an explicit timeout on the create request", async () => {
    let signal: AbortSignal | null | undefined;
    await createPostExOrder(samplePayload(), {
      env: { POSTEX_API_TOKEN: "merchant-token" },
      fetchImpl: async (_url, init) => {
        signal = init?.signal;
        return new Response(JSON.stringify({ statusCode: "200", dist: { trackingNumber: "PX-1" } }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      },
    });
    assert.ok(signal);
  });

  it("keeps all provider responses without tracking locked until reconciliation", async () => {
    const env = { POSTEX_API_TOKEN: "merchant-token" };
    for (const httpStatus of [401, 429]) {
      const result = await createPostExOrder(samplePayload(), {
        env,
        fetchImpl: async () => new Response(JSON.stringify({ statusCode: String(httpStatus) }), {
          status: httpStatus, headers: { "content-type": "application/json" },
        }),
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.failureKind, "unknown");
    }
    const missing = await createPostExOrder(samplePayload(), {
      env,
      fetchImpl: async () => new Response(JSON.stringify({ statusCode: "200", dist: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      }),
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.failureKind, "unknown");
  });
});
