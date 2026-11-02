import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  courierBookingAllowed,
  resolveCourierBookingMode,
} from "./courier-booking-mode";

describe("courier-booking-mode", () => {
  it("defaults preview/local to mock", () => {
    assert.equal(
      resolveCourierBookingMode({ VERCEL_ENV: "preview" }),
      "mock",
    );
    assert.equal(courierBookingAllowed({ VERCEL_ENV: "preview" }), false);
  });

  it("allows live only when explicitly configured or production default", () => {
    assert.equal(
      resolveCourierBookingMode({ COURIER_BOOKING_MODE: "live" }),
      "live",
    );
    assert.equal(
      resolveCourierBookingMode({ VERCEL_ENV: "production" }),
      "live",
    );
    assert.equal(
      resolveCourierBookingMode({ POSTEX_BOOKING_MODE: "disabled" }),
      "disabled",
    );
  });
});
