import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const migration = readFileSync(
  resolve(root, "supabase/migrations/20261024000000_customer_contact_lifecycle.sql"),
  "utf8",
);

describe("customer contact lifecycle migration", () => {
  it("keeps support updates transactional and auditable", () => {
    assert.match(migration, /admin_update_contact_submission/iu);
    assert.match(migration, /contact_submission_events/iu);
    assert.match(migration, /FOR UPDATE/iu);
    assert.match(migration, /GRANT EXECUTE[^;]+service_role/isu);
  });

  it("records newsletter consent and preserves unsubscribe suppression", () => {
    assert.match(migration, /status IN \('subscribed', 'unsubscribed'\)/iu);
    assert.match(migration, /consent_at/iu);
    assert.match(migration, /unsubscribed_at/iu);
    assert.match(migration, /admin_unsubscribe_newsletter/iu);
  });

  it("groups customer rollups by normalized phone before email", () => {
    assert.match(migration, /COALESCE\(normalized_phone, email, order_id\)/iu);
  });
});
