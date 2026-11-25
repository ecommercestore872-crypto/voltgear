import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_ORDER_SOUND, ORDER_SOUNDS, orderSoundById } from "./admin-order-sounds";

describe("admin order sounds", () => {
  it("has unique ids and the default exists", () => {
    assert.equal(new Set(ORDER_SOUNDS.map((s) => s.id)).size, ORDER_SOUNDS.length);
    assert.equal(orderSoundById(DEFAULT_ORDER_SOUND).id, DEFAULT_ORDER_SOUND);
  });

  it("falls back to the default for unknown or missing ids", () => {
    assert.equal(orderSoundById("nope").id, DEFAULT_ORDER_SOUND);
    assert.equal(orderSoundById(null).id, DEFAULT_ORDER_SOUND);
  });
});
