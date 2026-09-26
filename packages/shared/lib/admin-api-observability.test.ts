import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminApiSlowThresholdMs,
  DEFAULT_ADMIN_API_SLOW_MS,
} from "./admin-api-observability";

describe("admin-api-observability", () => {
  it("uses default slow threshold", () => {
    const prev = process.env.ADMIN_API_SLOW_MS;
    delete process.env.ADMIN_API_SLOW_MS;
    assert.equal(adminApiSlowThresholdMs(), DEFAULT_ADMIN_API_SLOW_MS);
    if (prev !== undefined) process.env.ADMIN_API_SLOW_MS = prev;
  });
});
