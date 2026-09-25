import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  auditEnvExamplePublicKeys,
  auditNextPublicEnvKey,
  tablesMissingRls,
} from "./security-audit-rules";

describe("tablesMissingRls", () => {
  it("flags tables without RLS enable", () => {
    const sql = `
      create table public.orders (id uuid);
      alter table public.orders enable row level security;
      create table public.leaks (id uuid);
    `;
    assert.deepEqual(tablesMissingRls(sql), ["leaks"]);
  });
});

describe("auditNextPublicEnvKey", () => {
  it("rejects secrets in NEXT_PUBLIC names", () => {
    const r = auditNextPublicEnvKey("NEXT_PUBLIC_ADMIN_TOKEN");
    assert.equal(r.ok, false);
  });

  it("allows documented public keys", () => {
    assert.equal(auditNextPublicEnvKey("NEXT_PUBLIC_SITE_URL").ok, true);
  });
});

describe("auditEnvExamplePublicKeys", () => {
  it("passes on current .env.example shape", () => {
    const sample = `
NEXT_PUBLIC_SITE_URL=https://buyntryy.com
NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon
`;
    assert.deepEqual(auditEnvExamplePublicKeys(sample), []);
  });
});
