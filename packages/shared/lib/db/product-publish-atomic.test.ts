import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const repositoryRoot = path.resolve(import.meta.dirname, "../../../..");
const migration = readFileSync(
  path.join(repositoryRoot, "supabase/migrations/20261028000000_product_integrity_v2.sql"),
  "utf8",
);
const adapter = readFileSync(
  path.join(repositoryRoot, "packages/shared/lib/db/admin-product-write-store.ts"),
  "utf8",
);

describe("v2 product write source contract (not database execution)", () => {
  it("uses only the versioned product transaction and never publishes moderation data", () => {
    assert.match(migration, /create or replace function public\.admin_write_product_v2/i);
    assert.match(migration, /update public\.products set/i);
    assert.match(migration, /delete from public\.product_images/i);
    assert.doesNotMatch(migration, /delete from public\.product_reviews/i);
    assert.doesNotMatch(migration, /\b(?:rating|review_count)\s*=/i);
    assert.match(migration, /delete from public\.collection_products/i);
    assert.match(adapter, /\.rpc\("admin_write_product_v2"/);
    assert.doesNotMatch(adapter, /\.rpc\("admin_publish_product"|p_reviews/);
    assert.doesNotMatch(adapter, /from\("product_images"\)\.delete/);
  });

  it("restricts v2 execution and retires the unsafe legacy writer", () => {
    assert.match(migration, /revoke all on function public\.admin_write_product_v2[\s\S]*authenticated/i);
    assert.match(migration, /grant execute on function public\.admin_write_product_v2[\s\S]*to service_role/i);
    assert.match(migration, /revoke all on function public\.admin_publish_product[\s\S]*service_role/i);
  });

  it("locks existing product state and persists draft-only membership/stock intent", () => {
    assert.match(migration, /for update/i);
    assert.match(migration, /inventory_revision/i);
    assert.match(migration, /admin_revision/i);
    assert.match(migration, /_collectionIds/);
    assert.match(migration, /insert into public\.products/i);
    assert.match(migration, /insert into public\.collection_products/i);
    assert.doesNotMatch(adapter, /\.rpc\("admin_create_product_draft"/);
  });
});
