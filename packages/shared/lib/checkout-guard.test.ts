import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cacheCheckoutOrder,
  getCachedCheckoutOrder,
  readIdempotencyKey,
  takeCheckoutRateLimit,
} from "./checkout-guard";

describe("readIdempotencyKey", () => {
  it("prefers Idempotency-Key header over body", () => {
    const req = new Request("https://buyntryy.com/api/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": "header-key-12345678" },
    });
    assert.equal(readIdempotencyKey(req, "body-key-12345678"), "header-key-12345678");
  });

  it("rejects keys that are too short", () => {
    const req = new Request("https://buyntryy.com/api/checkout", {
      headers: { "Idempotency-Key": "short" },
    });
    assert.equal(readIdempotencyKey(req), null);
  });

  it("accepts body key when header missing", () => {
    const req = new Request("https://buyntryy.com/api/checkout");
    assert.equal(readIdempotencyKey(req, "client-key-abcdefgh"), "client-key-abcdefgh");
  });
});

describe("checkout idempotency cache", () => {
  it("returns cached order id for the same key", () => {
    const key = `test-${Date.now()}-idem-key-1`;
    cacheCheckoutOrder(key, "VG-TEST001");
    assert.equal(getCachedCheckoutOrder(key), "VG-TEST001");
  });
});

describe("takeCheckoutRateLimit", () => {
  it("blocks after too many attempts for same email bucket", () => {
    const email = `rate-${Date.now()}@example.com`;
    let last = takeCheckoutRateLimit({ ip: "1.2.3.4", email });
    for (let i = 0; i < 8; i++) {
      last = takeCheckoutRateLimit({ ip: "1.2.3.4", email });
    }
    assert.equal(last.ok, false);
  });
});
