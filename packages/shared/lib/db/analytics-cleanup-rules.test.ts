import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { orphanVisitorIds, planAnalyticsCleanup } from "./analytics-cleanup-rules";

describe("planAnalyticsCleanup", () => {
  it("cuts sessions at 90 days and visitors at 365 days before now", () => {
    const now = new Date("2026-08-28T12:00:00.000Z");
    const plan = planAnalyticsCleanup(now);

    assert.equal(
      plan.sessionLastActivityBefore.toISOString(),
      new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    );
    assert.equal(
      plan.visitorLastSeenBefore.toISOString(),
      new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
    );
    assert.ok(plan.visitorLastSeenBefore < plan.sessionLastActivityBefore);
    assert.ok(plan.sessionLastActivityBefore < now);
  });

  it("skips visitor deletes when the session probe failed", () => {
    assert.equal(
      orphanVisitorIds(["v1", "v2"], [], true),
      null
    );
  });

  it("deletes only visitors with no remaining sessions", () => {
    assert.deepEqual(orphanVisitorIds(["v1", "v2", "v3"], ["v2"], false), [
      "v1",
      "v3",
    ]);
  });
});
