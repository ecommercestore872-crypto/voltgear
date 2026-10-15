import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261017000000_admin_customer_rollups_security_invoker.sql",
  ),
  "utf8",
);
const inventoryMigration = readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/20261026000000_harden_checkout_decrement_inventory.sql",
  ),
  "utf8",
);

describe("legacy database hardening migration", () => {
  it("makes the customer rollup view invoker-only and service-role-only", () => {
    assert.match(migration, /admin_customer_rollups SET \(security_invoker = true\)/iu);
    assert.match(
      migration,
      /REVOKE ALL ON TABLE public\.admin_customer_rollups FROM PUBLIC, anon, authenticated/iu,
    );
    assert.match(
      migration,
      /GRANT SELECT ON TABLE public\.admin_customer_rollups TO service_role/iu,
    );
  });

  it("pins legacy function search paths and removes browser-role execution", () => {
    for (const name of ["admin_order_dashboard_metrics", "get_low_stock_threshold"]) {
      assert.match(
        migration,
        new RegExp(`ALTER FUNCTION public\\.${name}\\([^)]*\\)[\\s\\S]*SET search_path = public, pg_temp`, "iu"),
      );
    }
    for (const name of [
      "admin_order_dashboard_metrics",
      "get_low_stock_threshold",
      "next_order_public_number",
    ]) {
      assert.match(
        migration,
        new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}\\([^)]*\\)[\\s\\S]*FROM PUBLIC, anon, authenticated`, "iu"),
      );
    }
  });

  it("conditionally revokes access to the platform legacy RLS helper", () => {
    assert.match(migration, /to_regprocedure\('public\.rls_auto_enable\(\)'\)/iu);
    assert.match(migration, /REVOKE ALL ON FUNCTION public\.rls_auto_enable\(\)/iu);
  });

  it("pins and restricts the legacy inventory RPC", () => {
    assert.match(
      inventoryMigration,
      /ALTER FUNCTION public\.checkout_decrement_inventory\([\s\S]*\) SET search_path = public, pg_temp/iu,
    );
    assert.match(
      inventoryMigration,
      /REVOKE ALL ON FUNCTION public\.checkout_decrement_inventory\([\s\S]*FROM PUBLIC, anon, authenticated/iu,
    );
    assert.match(inventoryMigration, /GRANT EXECUTE[\s\S]*TO service_role/iu);
  });
});
