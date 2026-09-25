import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDrExportManifest,
  drExportMonthFolder,
  validateDrExportManifest,
} from "./dr-export-rules";

describe("buildDrExportManifest", () => {
  it("sums row counts across critical tables", () => {
    const m = buildDrExportManifest({
      exportedAt: "2026-09-25T00:00:00.000Z",
      supabaseProjectRef: "zeuhfqevqjkbzwdaxjuv",
      counts: { orders: 10, products: 5 },
    });
    assert.equal(m.totalRows, 15);
    assert.equal(m.tables.orders, 10);
  });
});

describe("validateDrExportManifest", () => {
  it("accepts a well-formed manifest", () => {
    const m = buildDrExportManifest({
      exportedAt: "2026-09-25T00:00:00.000Z",
      counts: { orders: 1 },
    });
    assert.equal(validateDrExportManifest(m), true);
  });

  it("rejects invalid version", () => {
    assert.equal(validateDrExportManifest({ version: 2 }), false);
  });
});

describe("drExportMonthFolder", () => {
  it("uses UTC year-month", () => {
    assert.equal(
      drExportMonthFolder(new Date("2026-09-15T12:00:00.000Z")),
      "2026-09",
    );
  });
});
