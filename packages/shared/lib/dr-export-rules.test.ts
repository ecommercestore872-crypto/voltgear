import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDrExportManifest,
  DR_EXPORT_TABLES,
  drExportMonthFolder,
  validateDrExportManifest,
} from "./dr-export-rules";

describe("buildDrExportManifest", () => {
  it("exports the canonical product deals table", () => {
    assert.equal(DR_EXPORT_TABLES.includes("product_deals"), true);
    assert.equal((DR_EXPORT_TABLES as readonly string[]).includes("deals"), false);
  });

  it("sums row counts across critical tables", () => {
    const m = buildDrExportManifest({
      exportedAt: "2026-09-25T00:00:00.000Z",
      supabaseProjectRef: "zeuhfqevqjkbzwdaxjuv",
      counts: { orders: 10, products: 5 },
      sha256: Object.fromEntries(DR_EXPORT_TABLES.map((table) => [table, "a".repeat(64)])),
    });
    assert.equal(m.totalRows, 15);
    assert.equal(m.tables.orders, 10);
  });

  it("records tables that do not exist in the exported schema", () => {
    const m = buildDrExportManifest({
      exportedAt: "2026-09-25T00:00:00.000Z",
      counts: {},
      sha256: Object.fromEntries(DR_EXPORT_TABLES.map((table) => [table, "a".repeat(64)])),
      unavailableTables: ["contact_submission_events"],
    });
    assert.equal(m.tables.contact_submission_events, null);
    assert.equal(m.sha256.contact_submission_events, null);
    assert.deepEqual(m.unavailableTables, ["contact_submission_events"]);
    assert.equal(validateDrExportManifest(m), true);
  });
});

describe("validateDrExportManifest", () => {
  it("accepts a well-formed manifest", () => {
    const m = buildDrExportManifest({
      exportedAt: "2026-09-25T00:00:00.000Z",
      counts: { orders: 1 },
      sha256: Object.fromEntries(DR_EXPORT_TABLES.map((table) => [table, "b".repeat(64)])),
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
