import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PromoCodeRecord } from "./db/promo-rules";
import { pickWelcomeCoupon } from "./welcome-coupon-rules";

const now = new Date("2026-09-05T00:00:00.000Z");

function promo(partial: Partial<PromoCodeRecord> & { code: string }): PromoCodeRecord {
  return {
    type: "percent",
    value: 10,
    firstOrderOnly: true,
    active: true,
    startsAt: null,
    endsAt: null,
    ...partial,
  };
}

describe("pickWelcomeCoupon", () => {
  it("prefers an active BNT10 code", () => {
    const picked = pickWelcomeCoupon(
      [
        promo({ code: "VOLT10", firstOrderOnly: true }),
        promo({ code: "BNT10", firstOrderOnly: true }),
      ],
      now
    );
    assert.equal(picked?.code, "BNT10");
  });

  it("falls back to another first-order percent code when BNT10 is missing", () => {
    const picked = pickWelcomeCoupon(
      [promo({ code: "TRY15", value: 15, firstOrderOnly: true })],
      now
    );
    assert.equal(picked?.code, "TRY15");
  });

  it("returns null when the only welcome-looking code is inactive", () => {
    const picked = pickWelcomeCoupon(
      [promo({ code: "VOLT10", active: false, firstOrderOnly: true })],
      now
    );
    assert.equal(picked, null);
  });
});
