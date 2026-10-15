import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const migration = readFileSync(
  path.join(
    repositoryRoot,
    "supabase/migrations/20261019000000_atomic_promo_redemption.sql",
  ),
  "utf8",
);
const postPersist = readFileSync(
  path.join(repositoryRoot, "packages/shared/lib/checkout-post-persist.ts"),
  "utf8",
);

describe("atomic promo redemption", () => {
  it("locks and validates the promo before incrementing it in the order transaction", () => {
    assert.match(migration, /from promo_codes[\s\S]*for update/i);
    assert.match(migration, /v_promo_usage_count >= v_promo_max_usage/i);
    assert.match(migration, /update promo_codes[\s\S]*usage_count = usage_count \+ 1/i);
    assert.match(migration, /insert into orders/i);
  });

  it("serializes idempotent retries and first-order decisions", () => {
    assert.match(migration, /pg_advisory_xact_lock[\s\S]*checkout:/i);
    assert.match(migration, /pg_advisory_xact_lock[\s\S]*v_customer_email/i);
    assert.match(migration, /'replayed', true/i);
  });

  it("does not perform a second, post-response usage increment", () => {
    assert.doesNotMatch(postPersist, /incrementPromoUsage/);
  });

  it("keeps the RPC restricted to the service role", () => {
    assert.match(migration, /revoke all on function checkout_place_order[\s\S]*from authenticated/i);
    assert.match(migration, /grant execute on function checkout_place_order[\s\S]*to service_role/i);
  });
});
