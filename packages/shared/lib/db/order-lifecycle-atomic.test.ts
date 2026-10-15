import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.resolve(import.meta.dirname, "../../../..");
const migration = readFileSync(
  path.join(root, "supabase/migrations/20261020000000_atomic_order_lifecycle.sql"),
  "utf8",
);
const adapter = readFileSync(
  path.join(root, "packages/shared/lib/db/store-order-store.ts"),
  "utf8",
);
const quickAction = readFileSync(
  path.join(root, "apps/admin/app/api/admin/quick-action/route.ts"),
  "utf8",
);

describe("atomic order lifecycle", () => {
  it("cancels, writes history, and restores inventory in one RPC", () => {
    assert.match(migration, /function public\.cancel_order_restore_inventory/i);
    assert.match(migration, /from public\.orders[\s\S]*for update/i);
    assert.match(migration, /insert into public\.order_status_history/i);
    assert.match(migration, /update public\.products[\s\S]*quantity \+ item\.quantity/i);
    assert.match(adapter, /\.rpc\("cancel_order_restore_inventory"/);
    assert.doesNotMatch(adapter, /\[order\] atomic cancellation infra failed/);
  });

  it("updates ordinary status and history atomically", () => {
    assert.match(migration, /function public\.admin_update_order_status/i);
    assert.match(migration, /cancelled order cannot be reopened/i);
    assert.match(migration, /delivered order cannot move backwards/i);
    assert.match(migration, /order status cannot move backwards/i);
    assert.match(migration, /if \(case v_order\.status[\s\S]*end\)\s*>\s*\(case v_status[\s\S]*end\) then/i);
    assert.match(adapter, /\.rpc\("admin_update_order_status"/);
  });

  it("routes a signed cancellation through inventory restoration", () => {
    assert.match(quickAction, /parameters\.action === "cancelled"/);
    assert.match(quickAction, /cancelOrder\(parameters\.orderId, note\)/);
  });

  it("restricts lifecycle commands to the service role", () => {
    assert.match(migration, /revoke all on function public\.cancel_order_restore_inventory[\s\S]*authenticated/i);
    assert.match(migration, /grant execute on function public\.admin_update_order_status[\s\S]*service_role/i);
  });
});
