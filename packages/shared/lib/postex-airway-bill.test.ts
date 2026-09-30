import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAdminRequest } from "@/lib/admin";
import { resolvePostExGetInvoiceUrl } from "@/lib/postex";

import type { Order } from "@/lib/types";

import {
  fetchPostExAirwayBillPdf,
  formatPostExAirwayBillContentDisposition,
  runPostExAirwayBillForOrderId,
} from "./postex-airway-bill";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

const baseOrder = (): Order => ({
  _id: "uuid-1",
  orderId: "BNT-1032",
  createdAt: "2026-09-30T00:00:00.000Z",
  total: 6499,
  status: "processing",
  postexTrackingNumber: "23736240000001",
  items: [{ name: "Widget", quantity: 1 }],
});

describe("resolvePostExGetInvoiceUrl", () => {
  it("builds the integration get-invoice URL with trackingNumbers query", () => {
    assert.equal(
      resolvePostExGetInvoiceUrl("23736240000001", {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
      }),
      "https://api.postex.pk/services/integration/api/order/v1/get-invoice?trackingNumbers=23736240000001",
    );
  });
});

describe("formatPostExAirwayBillContentDisposition", () => {
  it("uses order id and tracking number in the filename", () => {
    assert.equal(
      formatPostExAirwayBillContentDisposition("BNT-1032", "23736240000001"),
      'inline; filename="PostEx-BNT-1032-23736240000001.pdf"',
    );
  });
});

describe("fetchPostExAirwayBillPdf", () => {
  it("sends token header and returns PDF bytes unchanged", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};

    const result = await fetchPostExAirwayBillPdf("23736240000001", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "merchant-token-secret",
      },
      fetchImpl: async (url, init) => {
        capturedUrl = String(url);
        capturedHeaders = Object.fromEntries(
          new Headers(init?.headers as HeadersInit).entries(),
        );
        return new Response(PDF_BYTES, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      capturedUrl,
      "https://api.postex.pk/services/integration/api/order/v1/get-invoice?trackingNumbers=23736240000001",
    );
    assert.equal(capturedHeaders.token, "merchant-token-secret");
    assert.equal(result.contentType, "application/pdf");
    assert.deepEqual(result.pdfBytes, PDF_BYTES);
    assert.equal(JSON.stringify(result).includes("merchant-token-secret"), false);
  });

  it("returns safe error for HTML/non-PDF upstream response", async () => {
    const result = await fetchPostExAirwayBillPdf("23736240000001", {
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
    assert.equal(result.error, "PostEx returned a non-PDF airway bill response.");
    assert.equal(JSON.stringify(result).includes("<html>"), false);
  });

  it("surfaces PostEx JSON business errors without raw HTML", async () => {
    const result = await fetchPostExAirwayBillPdf("23736240000001", {
      env: {
        POSTEX_API_BASE_URL: "https://api.postex.pk",
        POSTEX_API_TOKEN: "token",
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ statusCode: "400", statusMessage: "Invalid tracking" }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "Invalid tracking");
  });
});

describe("runPostExAirwayBillForOrderId", () => {
  it("returns pdf headers including Content-Disposition", async () => {
    const result = await runPostExAirwayBillForOrderId("BNT-1032", {
      getOrder: async () => baseOrder(),
      fetchAirwayBill: async () => ({
        ok: true,
        pdfBytes: PDF_BYTES,
        contentType: "application/pdf",
        contentDisposition: "",
      }),
    });

    assert.equal(result.kind, "pdf");
    if (result.kind !== "pdf") return;
    assert.equal(result.headers["Content-Type"], "application/pdf");
    assert.equal(
      result.headers["Content-Disposition"],
      'inline; filename="PostEx-BNT-1032-23736240000001.pdf"',
    );
    assert.deepEqual(result.pdfBytes, PDF_BYTES);
  });

  it("returns 400 when postex_tracking_number is missing", async () => {
    const result = await runPostExAirwayBillForOrderId("BNT-1032", {
      getOrder: async () => ({
        ...baseOrder(),
        postexTrackingNumber: undefined,
      }),
    });

    assert.equal(result.kind, "json");
    if (result.kind !== "json") return;
    assert.equal(result.status, 400);
  });

  it("never includes POSTEX_API_TOKEN in JSON error responses", async () => {
    const result = await runPostExAirwayBillForOrderId("BNT-1032", {
      getOrder: async () => baseOrder(),
      fetchAirwayBill: async () => ({
        ok: false,
        error: "PostEx API Token is missing.",
        httpStatus: 503,
      }),
    });

    assert.equal(result.kind, "json");
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("POSTEX_API_TOKEN"), false);
    assert.equal(serialized.includes("merchant-token"), false);
  });
});

describe("admin authentication for airway bill route", () => {
  it("requires admin credentials", () => {
    const secret = "test-admin-secret";
    const prev = process.env.ADMIN_TOKEN;
    process.env.ADMIN_TOKEN = secret;
    try {
      assert.equal(
        isAdminRequest(
          new Request("http://localhost/api/admin/postex/airway-bill/BNT-1032", {
            headers: { Authorization: `Bearer ${secret}` },
          }),
        ),
        true,
      );
      assert.equal(
        isAdminRequest(
          new Request("http://localhost/api/admin/postex/airway-bill/BNT-1032"),
        ),
        false,
      );
    } finally {
      if (prev === undefined) delete process.env.ADMIN_TOKEN;
      else process.env.ADMIN_TOKEN = prev;
    }
  });
});
