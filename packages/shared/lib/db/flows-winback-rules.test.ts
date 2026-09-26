import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  WINBACK_INACTIVE_MS,
  isEligibleWinbackEmail,
  winbackInactiveCutoffIso,
} from "./flows-winback-rules";

describe("flows-winback-rules", () => {
  it("computes cutoff 90 days before now", () => {
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    const cutoff = winbackInactiveCutoffIso(now);
    assert.equal(
      cutoff,
      new Date(now - WINBACK_INACTIVE_MS).toISOString(),
    );
  });

  it("requires a plausible email", () => {
    assert.equal(isEligibleWinbackEmail("a@b.co"), true);
    assert.equal(isEligibleWinbackEmail("  x@y.com "), true);
    assert.equal(isEligibleWinbackEmail(""), false);
    assert.equal(isEligibleWinbackEmail("phone-only"), false);
  });
});
