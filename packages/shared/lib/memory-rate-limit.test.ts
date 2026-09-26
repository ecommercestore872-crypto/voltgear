import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMemoryRateLimiter } from "./memory-rate-limit";

describe("createMemoryRateLimiter", () => {
  it("blocks after the limit within the window", () => {
    const lim = createMemoryRateLimiter({ limit: 2, windowMs: 60_000, maxKeys: 10 });
    assert.equal(lim.take({ ip: "1.2.3.4" }), true);
    assert.equal(lim.take({ ip: "1.2.3.4" }), true);
    assert.equal(lim.take({ ip: "1.2.3.4" }), false);
    assert.equal(lim.take({ ip: "5.6.7.8" }), true);
  });
});
