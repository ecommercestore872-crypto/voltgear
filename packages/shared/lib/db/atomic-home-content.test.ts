import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261025000000_atomic_home_content.sql"), "utf8");

describe("atomic home content migration", () => {
  it("replaces section fields and memberships in one function", () => {
    assert.match(migration, /admin_save_homepage_section/iu);
    assert.match(migration, /DELETE FROM public\.homepage_section_products/iu);
    assert.match(migration, /INSERT INTO public\.homepage_section_products/iu);
  });

  it("requires complete unique reorder lists", () => {
    assert.match(migration, /ordered ids must contain every section exactly once/iu);
    assert.match(migration, /ordered ids must contain every slide exactly once/iu);
  });

  it("serializes hero publishing and limits published slides", () => {
    assert.match(migration, /pg_advisory_xact_lock/iu);
    assert.match(migration, /maximum published hero slides reached/iu);
    assert.match(migration, /GRANT EXECUTE[^;]+service_role/isu);
  });
});
