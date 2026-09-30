import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cancelPostExShipment,
  resolvePostExCancelOrderUrl,
  runPostExCancelOrderForOrderId,
} from "./postex-cancel-order";

describe("resolvePostExCancelOrderUrl", () => {
  it("uses v1 cancel-order under integration path", () => {
    assert.equal(
      resolvePostExCancelOrderUrl({ POSTEX_API_BASE_URL: "https://api.postex.pk" }),
      "https://api.postex.pk/services/integration/api/order/v1/cancel-order",
    );
  });
});

describe("cancelPostExShipment", () => {
  it("PUTs JSON body with trackingNumber and token header", async () => {
    let method = "";
    let body = "";
    let headerToken = "";

    const result = await cancelPostExShipment("CX-999", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "secret",
      },
      fetchImpl: async (_url, init) => {
        method = init?.method ?? "";
        body = String(init?.body ?? "");
        headerToken = String(
          new Headers(init?.headers as HeadersInit).get("token") ?? "",
        );
        return new Response(
          JSON.stringify({ statusCode: "200", statusMessage: "SUCCESSFULLY OPERATED" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    });

    assert.equal(method, "PUT");
    assert.equal(headerToken, "secret");
    assert.deepEqual(JSON.parse(body), { trackingNumber: "CX-999" });
    assert.equal(result.ok, true);
  });
});

describe("runPostExCancelOrderForOrderId", () => {
  it("requires tracking on order", async () => {
    const result = await runPostExCancelOrderForOrderId("BNT-1", {
      getOrder: async () =>
        ({
          orderId: "BNT-1",
          postexTrackingNumber: "",
        }) as never,
    });
    assert.equal(result.status, 400);
  });
});
