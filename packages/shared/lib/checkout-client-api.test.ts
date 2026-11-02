import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCheckoutOrderBody,
  requestCheckoutOrder,
  requestCheckoutPromo,
} from "./checkout-client-api";

describe("buildCheckoutOrderBody", () => {
  it("preserves the checkout contract while omitting unavailable line metadata", () => {
    const body = buildCheckoutOrderBody({
      items: [
        {
          slug: "watch-one",
          name: "Watch One",
          price: 5_000,
          quantity: 2,
          productId: "product-1",
        },
        {
          slug: "watch-two",
          name: "Watch Two",
          price: 7_000,
          quantity: 1,
          sku: "WATCH-2",
          variantKey: "black",
          variantName: "Black",
          variantSku: "WATCH-2-BLACK",
        },
      ],
      customer: { name: "Ali", phone: "03001234567" },
      orderNotes: "  Call before delivery  ",
      paymentMethod: "cod",
      subtotal: 17_000,
      shipping: 0,
      total: 17_199,
      giftWrap: true,
      giftWrapFee: 199,
      idempotencyKey: "checkout-key",
      consent: "accepted",
      promoCode: "SAVE10",
      attribution: { utm_source: "instagram" },
    });

    assert.deepEqual(body, {
      items: [
        {
          slug: "watch-one",
          name: "Watch One",
          price: 5_000,
          quantity: 2,
        },
        {
          slug: "watch-two",
          name: "Watch Two",
          price: 7_000,
          quantity: 1,
          sku: "WATCH-2",
          variantKey: "black",
          variantName: "Black",
          variantSku: "WATCH-2-BLACK",
        },
      ],
      customer: {
        name: "Ali",
        phone: "03001234567",
        note: "Call before delivery",
      },
      payment: { method: "cod" },
      subtotal: 17_000,
      shipping: 0,
      total: 17_199,
      giftWrap: true,
      giftWrapFee: 199,
      idempotencyKey: "checkout-key",
      consent: "accepted",
      promoCode: "SAVE10",
      attribution: { utm_source: "instagram" },
    });
  });
});

describe("checkout client requests", () => {
  it("posts promo validation with the expected JSON contract", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input: String(input), init });
      return new Response(
        JSON.stringify({ ok: true, code: "SAVE10", discount: 500, shipping: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const result = await requestCheckoutPromo(
      {
        code: "SAVE10",
        subtotal: 5_000,
        shipping: 250,
        email: "buyer@example.com",
      },
      fetcher,
    );

    assert.equal(result.response.ok, true);
    assert.equal(result.data.code, "SAVE10");
    assert.equal(calls[0]?.input, "/api/promo/validate");
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      code: "SAVE10",
      subtotal: 5_000,
      shipping: 250,
      email: "buyer@example.com",
    });
  });

  it("posts checkout with the idempotency key in both header and body", async () => {
    const calls: Array<{ input: string; init?: RequestInit }> = [];
    const fetcher = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ input: String(input), init });
      return new Response(JSON.stringify({ ok: true, orderId: "order-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const body = buildCheckoutOrderBody({
      items: [],
      customer: {},
      orderNotes: "",
      paymentMethod: "cod",
      subtotal: 0,
      shipping: 0,
      total: 0,
      giftWrap: false,
      giftWrapFee: 0,
      idempotencyKey: "checkout-key",
      consent: null,
    });

    const result = await requestCheckoutOrder(body, "checkout-key", fetcher);

    assert.equal(result.data.orderId, "order-1");
    assert.equal(calls[0]?.input, "/api/checkout");
    assert.equal(
      new Headers(calls[0]?.init?.headers).get("Idempotency-Key"),
      "checkout-key",
    );
    assert.equal(JSON.parse(String(calls[0]?.init?.body)).idempotencyKey, "checkout-key");
    assert.ok(calls[0]?.init?.signal instanceof AbortSignal);
  });

  it("checkout times out without discarding the retry idempotency key", async () => {
    const body = buildCheckoutOrderBody({ items: [], customer: {}, orderNotes: "", paymentMethod: "cod",
      subtotal: 0, shipping: 0, total: 0, giftWrap: false, giftWrapFee: 0, idempotencyKey: "uncertain-key", consent: null });
    let key: string | null = null;
    const fetcher = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      key = new Headers(init?.headers).get("Idempotency-Key");
      return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("request did not abort")), 1000);
        init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(init.signal!.reason); }, { once: true });
      });
    };
    await assert.rejects(requestCheckoutOrder(body, "uncertain-key", fetcher, 5), { name: "TimeoutError" });
    assert.equal(key, "uncertain-key");
    const recovered = await requestCheckoutOrder(body, "uncertain-key", async (_input, init) => {
      assert.equal(new Headers(init?.headers).get("Idempotency-Key"), key);
      return new Response(JSON.stringify({ ok: true, orderId: "BNT-RECOVERED", replayed: true }));
    });
    assert.equal(recovered.data.orderId, "BNT-RECOVERED");
  });
});
