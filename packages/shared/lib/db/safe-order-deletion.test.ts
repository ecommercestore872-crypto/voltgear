import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.resolve(import.meta.dirname, "../../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20261021000000_safe_demo_data_deletion.sql"),
  "utf8",
);
const adapter = readFileSync(
  path.join(root, "packages/shared/lib/db/store-order-store.ts"),
  "utf8",
);
const communications = readFileSync(
  path.join(root, "packages/shared/lib/checkout-post-persist-communications.ts"),
  "utf8",
);

describe("safe order deletion", () => {
  it("permits atomic hard deletion only for demo orders", () => {
    assert.match(migration, /function public\.admin_delete_demo_order/i);
    assert.match(migration, /if not coalesce\(v_order\.is_demo, false\)/i);
    assert.match(migration, /live orders must be retained/i);
    assert.match(migration, /delete from public\.orders where id = v_order\.id/i);
    assert.match(adapter, /\.rpc\("admin_delete_demo_order"/);
    assert.doesNotMatch(adapter, /from\("order_items"\)\.delete/);
  });

  it("repairs reserved inventory and deletes queued demo email events", () => {
    assert.match(migration, /quantity \+ item\.quantity/i);
    assert.match(migration, /delete from public\.email_events/i);
    assert.match(migration, /function public\.admin_purge_demo_data/i);
  });

  it("prevents demo checkouts from sending or queuing communications", () => {
    assert.match(communications, /if \(input\.isDemo\) return/);
  });

  it("restricts destructive commands to the service role", () => {
    assert.match(migration, /revoke all on function public\.admin_delete_demo_order[\s\S]*authenticated/i);
    assert.match(migration, /grant execute on function public\.admin_purge_demo_data\(\)[\s\S]*service_role/i);
  });

  it("normalizes customer phone keys and uses latest contact values", () => {
    assert.match(migration, /create or replace view public\.admin_customer_rollups/i);
    assert.match(migration, /when length\(phone_digits\) = 11[\s\S]*'\+92'/i);
    assert.match(migration, /array_agg\(normalized_phone order by created_at desc\)/i);
    assert.match(migration, /with \(security_invoker = true\)/i);
  });
});
