import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import {
  buildAddToCartPayload,
  buildInitiateCheckoutPayload,
  buildPurchasePayload,
  buildSearchPayload,
  buildViewContentPayload,
  buildWishlistPayload,
  canSendTikTokBrowserEvents,
  checkoutCartFingerprint,
  initiateCheckoutDedupeKey,
  isCheckoutPricingReadyForInitiateCheckout,
  normalizeTikTokEmail,
  normalizeTikTokPhone,
  planTikTokInitiateCheckout,
  purchaseEventId,
  resolveTikTokContentId,
  sha256Hex,
  shouldFireInitiateCheckout,
  shouldFirePurchaseOnce,
  shouldFireViewContentOnce,
  trackTikTokAddToCart,
  trackTikTokPurchase,
} from "./tiktok-browser-events";

describe("resolveTikTokContentId", () => {
  it("prefers variantSku, then product sku, then slug::variantKey, then slug", () => {
    assert.equal(
      resolveTikTokContentId({
        variantSku: "SKU-V1",
        sku: "SKU-P",
        slug: "earbud",
        variantKey: "k1",
      }),
      "SKU-V1"
    );
    assert.equal(
      resolveTikTokContentId({ sku: "SKU-P", slug: "earbud", variantKey: "k1" }),
      "SKU-P"
    );
    assert.equal(
      resolveTikTokContentId({ slug: "earbud", variantKey: "k1" }),
      "earbud::k1"
    );
    assert.equal(resolveTikTokContentId({ slug: "earbud" }), "earbud");
    assert.equal(resolveTikTokContentId({ slug: "  " }), null);
  });
});

describe("canSendTikTokBrowserEvents", () => {
  const base = {
    pixelId: "DAF1KQBC77UES974M180",
    enabled: "true",
    consent: "all" as const,
    pathname: "/",
    nodeEnv: "production",
    host: "buyntryy.com",
  };

  it("blocks when disabled, no consent, essential-only, development, localhost, or excluded routes", () => {
    assert.equal(canSendTikTokBrowserEvents(base), true);
    assert.equal(canSendTikTokBrowserEvents({ ...base, enabled: "false" }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, consent: null }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, consent: "essential" }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, nodeEnv: "development" }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, host: "127.0.0.1" }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, pathname: "/admin" }), false);
    assert.equal(canSendTikTokBrowserEvents({ ...base, pathname: "/demo/login" }), false);
  });
});

describe("payload builders", () => {
  it("builds ViewContent with PKR and rejects malformed products", () => {
    const ok = buildViewContentPayload({
      slug: "fast-charger",
      name: "Fast Charger",
      category: "chargers",
      price: 4499,
      sku: "CHG-1",
    });
    assert.ok(ok);
    assert.equal(ok!.currency, "PKR");
    assert.equal(ok!.value, 4499);
    assert.equal(ok!.contents[0].content_id, "CHG-1");
    assert.equal(ok!.contents[0].content_type, "product");
    assert.equal(ok!.contents[0].num_items, 1);

    assert.equal(
      buildViewContentPayload({
        slug: "x",
        name: "X",
        category: "c",
        price: Number.NaN,
      }),
      null
    );
    assert.equal(
      buildViewContentPayload({
        slug: "",
        name: "X",
        category: "c",
        price: 10,
      }),
      null
    );
  });

  it("builds Search with search_string only when term is real; omits invented contents", () => {
    const ok = buildSearchPayload("  earbuds  ");
    assert.deepEqual(ok, { search_string: "earbuds" });
    assert.equal(buildSearchPayload("   "), null);
    assert.equal(buildSearchPayload(""), null);
  });

  it("builds AddToWishlist / AddToCart with quantity and value = price × qty", () => {
    const wish = buildWishlistPayload({
      slug: "buds",
      name: "Buds",
      category: "audio",
      price: 2000,
    });
    assert.equal(wish!.value, 2000);
    assert.equal(wish!.contents[0].num_items, 1);

    const cart = buildAddToCartPayload({
      slug: "buds",
      name: "Buds",
      category: "audio",
      price: 2000,
      quantity: 3,
      variantSku: "BUDS-BLK",
    });
    assert.equal(cart!.contents[0].content_id, "BUDS-BLK");
    assert.equal(cart!.contents[0].num_items, 3);
    assert.equal(cart!.value, 6000);
    assert.equal(
      buildAddToCartPayload({
        slug: "buds",
        name: "Buds",
        price: 2000,
        quantity: 0,
      }),
      null
    );
  });

  it("builds InitiateCheckout from cart snapshot and rejects empty cart", () => {
    const payload = buildInitiateCheckoutPayload([
      { slug: "a", name: "A", price: 100, quantity: 2 },
      { slug: "b", name: "B", price: 50, quantity: 1, variantKey: "v1" },
    ]);
    assert.equal(payload!.currency, "PKR");
    assert.equal(payload!.value, 250);
    assert.equal(payload!.contents.length, 2);
    assert.equal(payload!.contents[1].content_id, "b::v1");
    assert.equal(buildInitiateCheckoutPayload([]), null);
  });

  it("builds Purchase from server order snapshot with final total", () => {
    const payload = buildPurchasePayload({
      orderId: "BNT-1001",
      total: 5499,
      lines: [
        {
          slug: "fast-charger",
          name: "Fast Charger",
          quantity: 1,
          variantSku: "CHG-1",
          category: "chargers",
        },
      ],
    });
    assert.equal(payload!.value, 5499);
    assert.equal(payload!.currency, "PKR");
    assert.equal(payload!.contents[0].content_id, "CHG-1");
    assert.equal(buildPurchasePayload({ orderId: "", total: 10, lines: [] }), null);
    assert.equal(
      buildPurchasePayload({
        orderId: "BNT-1",
        total: Number.NaN,
        lines: [{ slug: "a", name: "A", quantity: 1 }],
      }),
      null
    );
  });
});

describe("event ids and dedupe", () => {
  afterEach(() => {
    shouldFireViewContentOnce.reset?.();
    shouldFirePurchaseOnce.reset?.();
    shouldFireInitiateCheckout.reset?.();
  });

  it("uses stable purchase_<orderId> and differs across orders", () => {
    assert.equal(purchaseEventId("BNT-9"), "purchase_BNT-9");
    assert.notEqual(purchaseEventId("BNT-1"), purchaseEventId("BNT-2"));
  });

  it("suppresses duplicate ViewContent for the same content within the short window", () => {
    assert.equal(shouldFireViewContentOnce("sku-1"), true);
    assert.equal(shouldFireViewContentOnce("sku-1"), false);
    assert.equal(shouldFireViewContentOnce("sku-2"), true);
  });

  it("scopes InitiateCheckout dedupe to checkout:<fingerprint> per cart snapshot", () => {
    const a = checkoutCartFingerprint([
      { slug: "x", quantity: 1 },
      { slug: "y", variantKey: "v", quantity: 2 },
    ]);
    const b = checkoutCartFingerprint([
      { slug: "x", quantity: 2 },
      { slug: "y", variantKey: "v", quantity: 2 },
    ]);
    assert.notEqual(a, b);
    assert.equal(initiateCheckoutDedupeKey(a), `checkout:${a}`);

    const store = new Map<string, string>();
    assert.equal(shouldFireInitiateCheckout(a, store), true);
    assert.equal(shouldFireInitiateCheckout(a, store), false);
    assert.equal(shouldFireInitiateCheckout(b, store), true);
  });

  it("fires Purchase once per order id", () => {
    const store = new Map<string, string>();
    assert.equal(shouldFirePurchaseOnce("BNT-1", store), true);
    assert.equal(shouldFirePurchaseOnce("BNT-1", store), false);
    assert.equal(shouldFirePurchaseOnce("BNT-2", store), true);
  });
});

describe("identity hashing", () => {
  it("normalizes email and hashes; omits empty; never returns raw PII", async () => {
    assert.equal(normalizeTikTokEmail("  A@B.Com "), "a@b.com");
    assert.equal(normalizeTikTokEmail("not-an-email"), null);
    assert.equal(normalizeTikTokEmail(""), null);

    const hashed = await sha256Hex("a@b.com");
    assert.equal(hashed, createHash("sha256").update("a@b.com").digest("hex"));
    assert.notEqual(hashed, "a@b.com");
  });

  it("normalizes phone to E.164 before hashing", async () => {
    assert.equal(normalizeTikTokPhone("0300 1234567"), "+923001234567");
    assert.equal(normalizeTikTokPhone("bad"), null);
    const hashed = await sha256Hex("+923001234567");
    assert.equal(
      hashed,
      createHash("sha256").update("+923001234567").digest("hex")
    );
  });
});

describe("InitiateCheckout pricing readiness", () => {
  const line = {
    slug: "charger",
    name: "Charger",
    price: 2000,
    quantity: 1,
  };

  afterEach(() => {
    shouldFireInitiateCheckout.reset?.();
  });

  it("does not fire while deal quote / pricing is unresolved", () => {
    assert.equal(
      isCheckoutPricingReadyForInitiateCheckout({
        hasItems: true,
        dealQuoteReady: false,
      }),
      false
    );
    const store = new Map<string, string>();
    const attempt = planTikTokInitiateCheckout({
      items: [line],
      total: 2499,
      dealQuoteReady: false,
      store,
    });
    assert.equal(attempt.fired, false);
    assert.equal(attempt.reason, "pricing_unresolved");
    assert.equal(store.size, 0);
  });

  it("does not fire while a promo apply is loading", () => {
    const attempt = planTikTokInitiateCheckout({
      items: [line],
      total: 2499,
      dealQuoteReady: true,
      promoLoading: true,
      store: new Map(),
    });
    assert.equal(attempt.fired, false);
    assert.equal(attempt.reason, "pricing_unresolved");
  });

  it("fires once when pricing becomes ready and uses the resolved total", () => {
    const store = new Map<string, string>();
    const pending = planTikTokInitiateCheckout({
      items: [line],
      total: 2499,
      dealQuoteReady: false,
      store,
    });
    assert.equal(pending.fired, false);

    const ready = planTikTokInitiateCheckout({
      items: [line],
      total: 2499,
      dealQuoteReady: true,
      store,
    });
    assert.equal(ready.fired, true);
    assert.equal(ready.value, 2499);
    assert.equal(ready.payload?.value, 2499);

    const rerender = planTikTokInitiateCheckout({
      items: [line],
      total: 2499,
      dealQuoteReady: true,
      store,
    });
    assert.equal(rerender.fired, false);
    assert.equal(rerender.reason, "duplicate");
  });

  it("changed cart waits for new resolved total before firing again", () => {
    const store = new Map<string, string>();
    assert.equal(
      planTikTokInitiateCheckout({
        items: [line],
        total: 2499,
        dealQuoteReady: true,
        store,
      }).fired,
      true
    );

    const changed = [{ ...line, quantity: 2 }];
    const whileLoading = planTikTokInitiateCheckout({
      items: changed,
      total: 4499,
      dealQuoteReady: false,
      store,
    });
    assert.equal(whileLoading.fired, false);
    assert.equal(whileLoading.reason, "pricing_unresolved");

    const afterReady = planTikTokInitiateCheckout({
      items: changed,
      total: 4499,
      dealQuoteReady: true,
      store,
    });
    assert.equal(afterReady.fired, true);
    assert.equal(afterReady.value, 4499);
    assert.notEqual(
      checkoutCartFingerprint([line]),
      checkoutCartFingerprint(changed)
    );
  });
});

describe("fail-open browser trackers", () => {
  it("does not throw when ttq is missing (cart/checkout safe)", () => {
    assert.equal(
      trackTikTokAddToCart({
        slug: "x",
        name: "X",
        price: 100,
        quantity: 1,
      }),
      null
    );
    assert.equal(
      trackTikTokPurchase({
        orderId: "BNT-FAIL",
        total: 100,
        lines: [{ slug: "x", name: "X", quantity: 1 }],
      }),
      null
    );
  });
});
