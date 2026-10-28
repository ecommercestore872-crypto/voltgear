import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { loadLocalRuntime, root, stagingDirectory } from './runtime.mjs';
import { localAppEnvironment, startLocalApp } from './local-app.mjs';

// AFTER the two production builds. Never roll back to a permanent-cookie app or
// enable legacy writers. This tests only local built binaries and local schema.
const runtime = await loadLocalRuntime();
const admin = 'http://127.0.0.1:3301';
const email = `release-${randomUUID()}@example.invalid`; const password = randomUUID() + randomUUID();
const secret = randomUUID() + randomUUID(); const results = []; const apps = [];
let phase = 'setup'; let failure; let productId; let lastRequest;
const ids = {};
for (const name of ['admin', 'storefront']) ids[name] = (await readFile(join(root, 'apps', name, '.next/BUILD_ID'), 'utf8')).trim();
const signature = 'public.admin_write_product_v2(text,uuid,jsonb,jsonb,bigint)';
const check = async (name, action) => { phase = name; await action(); results.push({ name, passed: true }); console.log(`PASS: ${name}`); };
const digest = () => runtime.sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text,'[]')) FROM public.products p;");
async function request(path, { method = 'GET', body, cookie, bearer = false } = {}) {
  const response = await fetch(`${admin}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', Origin: admin, ...(cookie ? { Cookie: cookie } : {}),
      ...(bearer ? { Authorization: `Bearer ${secret}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  lastRequest = { path, method, status: response.status };
  return response;
}
try {
  const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }) }); assert.equal(created.status, 200);
  const environment = localAppEnvironment(runtime, { email, secret });
  for (const name of ['storefront', 'admin']) apps.push(await startLocalApp(name, environment, { productionBuild: true }));
  let cookie;
  await check('matching production binaries and complete schema authenticate; legacy cookie rejected', async () => {
    assert.equal((await request('/api/admin/products')).status, 401);
    const legacy = createHmac('sha256', secret).update('voltgear-admin-session-v1').digest('hex');
    assert.equal((await request('/api/admin/products', { cookie: `vg_admin=${legacy}` })).status, 401);
    const signed = await request('/api/admin/login', { method: 'POST', body: { email, password } }); assert.equal(signed.status, 200);
    const header = signed.headers.get('set-cookie'); assert.match(header, /secure/i); cookie = header.split(';')[0];
    assert.equal((await request('/api/admin/products', { cookie })).status, 200);
    assert.equal((await request('/api/admin/products', { bearer: true })).status, 200);
  });
  await check('failed local migration transaction leaves catalog and schema intact', async () => {
    const before = digest(); const table = `acceptance_migration_probe_${randomUUID().replaceAll('-', '')}`;
    assert.throws(() => runtime.sql(`BEGIN; CREATE TABLE public.${table}(id int); DO $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_MIGRATION_FAILURE'; END $$; COMMIT;`));
    assert.equal(runtime.sql(`SELECT to_regclass('public.${table}') IS NULL;`), 't'); assert.equal(digest(), before);
    await loadLocalRuntime();
  });
  const doc = { name: 'Synthetic built release recovery', slug: `built-recovery-${randomUUID()}`, price: 100,
    category: runtime.sql('SELECT slug FROM categories ORDER BY slug LIMIT 1;'), quantity: 2, stockStatus: 'in-stock', images: [] };
  let revision;
  await check('safe-writer outage fails closed; same immutable app recovers without legacy writers', async () => {
    const before = digest();
    try {
      runtime.sql(`REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role;`);
      assert.equal((await request('/api/admin/products', { method: 'POST', cookie, body: { doc } })).status, 503); assert.equal(digest(), before);
    } finally { runtime.sql(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`); }
    const response = await request('/api/admin/products', { method: 'POST', cookie, body: { doc } }); assert.equal(response.status, 200);
    const created = await response.json(); productId = created.id; revision = created.adminRevision;
    assert.equal(runtime.sql("SELECT has_function_privilege('service_role','public.admin_create_product_draft(jsonb,jsonb)','EXECUTE');"), 'f');
  });
  await check('warm built storefront PDP reflects cross-application publication invalidation', async () => {
    const published = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { action: 'publish', doc, expectedAdminRevision: revision } }); assert.equal(published.status, 200);
    revision = (await published.json()).adminRevision;
    const url = `http://127.0.0.1:3300/product/${doc.slug}`;
    const read = async () => { const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(90_000) });
      assert.equal(response.status, 200); return response.text(); };
    assert.ok((await read()).includes(doc.name)); await read();
    const name = `Synthetic published after warm cache ${randomUUID()}`;
    const updated = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { action: 'publish', doc: { ...doc, name, inventoryIntent: { mode: 'preserve' } }, expectedAdminRevision: revision } });
    assert.equal(updated.status, 200);
    let visible = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      if ((await read()).includes(name)) { visible = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(visible, 'Warmed built PDP must show the newly published name');
  });
  await check('built app logout revokes copied cookie; build identifiers stay unchanged', async () => {
    assert.equal((await request('/api/admin/logout', { method: 'POST', cookie })).status, 200);
    assert.equal((await request('/api/admin/products', { cookie })).status, 401);
    for (const name of ['admin', 'storefront']) assert.equal((await readFile(join(root, 'apps', name, '.next/BUILD_ID'), 'utf8')).trim(), ids[name]);
  });
} catch (error) {
  failure = true; console.error(JSON.stringify({ failedPhase: phase, lastRequest, actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined }));
} finally {
  for (const app of apps.reverse()) await app.close();
  await writeFile(join(stagingDirectory, 'release-results.json'), JSON.stringify({ passed: !failure, results, lastRequest,
    buildIds: ids, productId, migrationSha256: createHash('sha256').update(await readFile(join(root, 'supabase/migrations/20261030000000_admin_browser_sessions.sql'))).digest('hex'),
    scope: 'Same local immutable production builds and compatible schema recovery. No hosted deployment drain/traffic shift/protection was executed.' }, null, 2));
}
if (failure) process.exitCode = 1;
