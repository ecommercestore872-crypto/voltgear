import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const migration = readFileSync(
  path.join(repositoryRoot, "supabase/migrations/20261018000000_atomic_product_publish.sql"),
  "utf8",
);
const adapter = readFileSync(
  path.join(repositoryRoot, "packages/shared/lib/db/admin-product-write-store.ts"),
  "utf8",
);

describe("atomic product publishing", () => {
  it("publishes the product and replaces every child collection inside one RPC", () => {
    assert.match(migration, /create or replace function public\.admin_publish_product/i);
    assert.match(migration, /update public\.products set/i);
    assert.match(migration, /delete from public\.product_images/i);
    assert.match(migration, /delete from public\.product_variants/i);
    assert.match(migration, /delete from public\.product_reviews/i);
    assert.match(migration, /delete from public\.collection_products/i);
    assert.match(migration, /on conflict \(collection_id, product_id\) do nothing/i);
    assert.match(adapter, /\.rpc\("admin_publish_product"/);
    assert.doesNotMatch(adapter, /from\("product_images"\)\.delete/);
  });

  it("makes the add-ons schema explicit and restricts RPC execution", () => {
    assert.match(migration, /add column if not exists addons jsonb/i);
    assert.match(migration, /revoke all on function public\.admin_publish_product[\s\S]*from authenticated/i);
    assert.match(migration, /grant execute on function public\.admin_publish_product[\s\S]*to service_role/i);
  });

  it("creates a draft and its initial manual memberships atomically", () => {
    assert.match(migration, /create or replace function public\.admin_create_product_draft/i);
    assert.match(migration, /insert into public\.products/i);
    assert.match(migration, /insert into public\.collection_products/i);
    assert.match(adapter, /\.rpc\("admin_create_product_draft"/);
  });
});
