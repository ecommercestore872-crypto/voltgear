import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';

const runtime = await loadLocalRuntime();
const admin = 'http://127.0.0.1:3301';
const input = JSON.parse(await readFile(join(stagingDirectory, 'browser-input.json'), 'utf8'));
assert.match(input.email, /^browser-[0-9a-f-]+@example\.invalid$/);
const login = await fetch(`${admin}/api/admin/login`, { method: 'POST', redirect: 'error',
  signal: AbortSignal.timeout(90_000), headers: { 'Content-Type': 'application/json', Origin: admin }, body: JSON.stringify(input) });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const signature = 'public.admin_write_product_v2(text,uuid,jsonb,jsonb,bigint)';
assert.equal(runtime.sql(`SELECT has_function_privilege('service_role','${signature}','EXECUTE');`), 't');
const before = runtime.sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]')) FROM public.products p;");
const doc = { name: 'Synthetic recovery fixture', slug: `recovery-${randomUUID()}`,
  category: runtime.sql('SELECT slug FROM categories ORDER BY slug LIMIT 1;'), price: 100, quantity: 2, stockStatus: 'in-stock', images: [] };
const ledger = { isolated: true, permissionRestored: false, unavailableStatus: null, recoveredStatus: null };
const ledgerPath = join(stagingDirectory, 'http-recovery-results.json');
async function create() {
  return fetch(`${admin}/api/admin/products`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', Origin: admin, Cookie: cookie }, body: JSON.stringify({ doc }) });
}
await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
try {
  runtime.sql(`REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role;`);
  const unavailable = await create();
  ledger.unavailableStatus = unavailable.status;
  assert.equal(unavailable.status, 503);
  assert.equal(runtime.sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]')) FROM public.products p;"), before);
  console.log('PASS: unavailable safe writer returns actual HTTP503; all product rows remain unchanged; no legacy fallback.');
} finally {
  runtime.sql(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
  ledger.permissionRestored = true;
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
}
const recovered = await create();
ledger.recoveredStatus = recovered.status;
assert.equal(recovered.status, 200);
ledger.productId = (await recovered.json()).id;
assert.ok(ledger.productId);
assert.equal(runtime.sql("SELECT has_function_privilege('service_role','public.admin_create_product_draft(jsonb,jsonb)','EXECUTE');"), 'f');
console.log('PASS: restored compatible v2 writer succeeds HTTP200; unsafe legacy create remains revoked.');
await writeFile(ledgerPath, JSON.stringify(ledger, null, 2));
