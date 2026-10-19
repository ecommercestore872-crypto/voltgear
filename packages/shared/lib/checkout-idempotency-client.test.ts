import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHECKOUT_IDEMPOTENCY_STORAGE_KEY,
  getOrCreateCheckoutIdempotency,
} from "./checkout-idempotency-client";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const items = [{ slug: "watch", quantity: 2, variantKey: "black" }];

describe("getOrCreateCheckoutIdempotency", () => {
  it("creates and persists one key for a cart snapshot", () => {
    const storage = new MemoryStorage();

    const result = getOrCreateCheckoutIdempotency({
      items,
      storage,
      createKey: () => "checkout-key-1",
      now: () => 123,
    });

    assert.equal(result.key, "checkout-key-1");
    assert.deepEqual(
      JSON.parse(String(storage.getItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY))),
      {
        key: "checkout-key-1",
        cartFingerprint: result.fingerprint,
        createdAt: 123,
      },
    );
  });

  it("reuses the in-memory or stored key only for the same cart", () => {
    const storage = new MemoryStorage();
    const first = getOrCreateCheckoutIdempotency({
      items,
      storage,
      createKey: () => "checkout-key-1",
    });

    const fromMemory = getOrCreateCheckoutIdempotency({
      items,
      storage,
      current: first,
      createKey: () => "must-not-run",
    });
    const fromStorage = getOrCreateCheckoutIdempotency({
      items,
      storage,
      createKey: () => "must-not-run",
    });
    const changedCart = getOrCreateCheckoutIdempotency({
      items: [{ slug: "watch", quantity: 3, variantKey: "black" }],
      storage,
      current: first,
      createKey: () => "checkout-key-2",
    });

    assert.equal(fromMemory.key, "checkout-key-1");
    assert.equal(fromStorage.key, "checkout-key-1");
    assert.equal(changedCart.key, "checkout-key-2");
  });

  it("replaces malformed persisted data safely", () => {
    const storage = new MemoryStorage();
    storage.setItem(CHECKOUT_IDEMPOTENCY_STORAGE_KEY, "not-json");

    const result = getOrCreateCheckoutIdempotency({
      items,
      storage,
      createKey: () => "checkout-key-new",
    });

    assert.equal(result.key, "checkout-key-new");
  });
});
