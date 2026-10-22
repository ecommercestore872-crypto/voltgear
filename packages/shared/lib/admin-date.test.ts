import assert from "node:assert/strict";
import { it } from "node:test";
import { formatAdminOrderDate } from "./admin-date";

it("formats order timestamps in Pakistan time independently of the process timezone", () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Karachi"]) {
      process.env.TZ = zone;
      assert.equal(formatAdminOrderDate("2026-10-01T00:00:00.000Z"), "1 Oct 2026, 05:00");
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

it("handles absent and malformed timestamps without a render exception", () => {
  for (const value of [undefined, null, "", "not-a-date"]) {
    assert.equal(formatAdminOrderDate(value), "");
  }
});
