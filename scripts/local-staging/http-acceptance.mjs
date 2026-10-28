import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import net from 'node:net';
import { loadLocalRuntime, root, stagingDirectory, commandEnvironment } from './runtime.mjs';
import { requireLocalEndpoint } from './isolation.mjs';

const runtime = await loadLocalRuntime(); // Positive isolation required before writes.
const admin = requireLocalEndpoint('http://127.0.0.1:3301', 3301);
const shop = requireLocalEndpoint('http://127.0.0.1:3300', 3300);
for (const directory of [root, join(root, 'apps/admin'), join(root, 'apps/storefront')]) {
  const files = await readdir(directory);
  assert.ok(!files.some((name) => name.startsWith('.env') && !name.endsWith('.example')), 'App environment files forbidden in isolated acceptance');
}
const id = randomUUID();
const email = `acceptance-${id}@example.invalid`;
const password = randomUUID() + randomUUID();
const secret = randomUUID() + randomUUID();
const environment = { ...commandEnvironment(), NODE_ENV: 'development', NODE_OPTIONS: '--max-old-space-size=1024', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: runtime.api, NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY, ADMIN_TOKEN: secret,
  REVALIDATION_TOKEN: secret, ADMIN_AUTH_EMAILS: email, NEXT_PUBLIC_SITE_URL: shop,
  STOREFRONT_URL: shop, ADMIN_PUBLIC_URL: admin, ADMIN_PROXY_UPSTREAM: admin };
const apps = [];
const results = [];
let phase = 'local environment setup';
let lastRequest;
const fixtures = { run: id, api: runtime.api, admin, shop, productIds: [], collectionIds: [] };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const row = (productId) => JSON.parse(runtime.sql(`SELECT row_to_json(p) FROM public.products p WHERE id=${quote(productId)}::uuid;`));
async function check(name, run) { phase = name; await run(); results.push({ name, passed: true }); console.log(`PASS: ${name}`); }
async function request(path, { method = 'GET', body, cookie, origin = admin } = {}) {
  assert.ok(path.startsWith('/api/') && !path.startsWith('//'));
  const response = await fetch(`${admin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  lastRequest = { path, method, status: response.status };
  return { response, data };
}
async function launch(name, port) {
  // Refuse to test an unrelated pre-existing listener as if we launched it.
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); reject(new Error('Application port occupied')); });
    socket.once('error', (error) => { socket.destroy(); if (error.code === 'ECONNREFUSED') resolve(); else reject(new Error('Port ownership unavailable')); });
    socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Port probe timeout')); });
  });
  const process = spawn(globalThis.process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)],
    { cwd: join(root, 'apps', name), env: environment, stdio: 'ignore' });
  apps.push(process);
  for (let attempt = 0; attempt < 90; attempt++) {
    assert.equal(process.exitCode, null, 'Owned local app exited before readiness');
    try {
      const response = await fetch(`http://127.0.0.1:${port}${name === 'admin' ? '/admin/login' : '/robots.txt'}`, { redirect: 'error', signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch { /* bounded startup */ }
    await sleep(1000);
  }
  assert.fail('Owned local application readiness timeout');
}
let failure;
try {
  const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(created.status, 200, 'Synthetic local Auth user creation');
  fixtures.authUserId = (await created.json()).id;
  await launch('storefront', 3300);
  await launch('admin', 3301);
  let cookie;
  await check('unauthenticated admin HTTP request is 401', async () => {
    assert.equal((await request('/api/admin/products')).response.status, 401);
  });
  await check('real Supabase Auth login issues HttpOnly session cookie', async () => {
    const result = await request('/api/admin/login', { method: 'POST', body: { email, password } });
    assert.equal(result.response.status, 200);
    const header = result.response.headers.get('set-cookie');
    assert.ok(header?.includes('HttpOnly') || header?.includes('httponly'));
    cookie = header.split(';')[0];
    assert.equal((await request('/api/admin/products', { cookie })).response.status, 200);
  });
  const category = runtime.sql('SELECT slug FROM categories ORDER BY slug LIMIT 1;');
  assert.ok(category);
  const doc = { name: `Synthetic acceptance ${id}`, slug: `acceptance-${id}`, category,
    price: 100, costPrice: 20, quantity: 10, stockStatus: 'in-stock', images: [] };
  let productId;
  let revision;
  await check('real draft creation and coherent reopen', async () => {
    const result = await request('/api/admin/products', { method: 'POST', cookie, body: { doc } });
    assert.equal(result.response.status, 200, result.data.error);
    productId = result.data.id; revision = result.data.adminRevision; fixtures.productIds.push(productId);
    const reopened = await request(`/api/admin/products/${productId}`, { cookie });
    assert.equal(reopened.response.status, 200);
    assert.equal(reopened.data.product.draft.price, 100);
    assert.equal(reopened.data.product.adminRevision, revision);
    assert.equal(row(productId).status, 'draft');
  });
  await check('invalid price/quantity/action requests leave persisted state unchanged', async () => {
    const before = row(productId);
    for (const patch of [{ price: 'bad' }, { price: -1 }, { quantity: -1 }, { quantity: 1.5 }]) {
      const result = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
        body: { doc: { ...doc, ...patch }, expectedAdminRevision: revision } });
      assert.equal(result.response.status, 400);
      assert.deepEqual(row(productId), before);
    }
    assert.equal((await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { action: 'restock-magic', doc, expectedAdminRevision: revision } })).response.status, 400);
    assert.deepEqual(row(productId), before);
  });
  await check('cross-origin cookie mutation rejected without database change', async () => {
    const before = row(productId);
    const result = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie, origin: 'https://untrusted.example.invalid',
      body: { doc, expectedAdminRevision: revision } });
    // Existing route contract uses 401 for an untrusted cookie mutation, not 403.
    assert.equal(result.response.status, 401);
    assert.deepEqual(row(productId), before);
  });
  await check('draft save advances revision; stale editor conflicts and preserves committed state', async () => {
    const result = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { doc: { ...doc, price: 125 }, expectedAdminRevision: revision } });
    assert.equal(result.response.status, 200, result.data.error);
    const saved = row(productId);
    assert.equal(saved.draft.price, 125);
    const stale = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { doc: { ...doc, price: 5 }, expectedAdminRevision: revision } });
    assert.equal(stale.response.status, 409);
    assert.deepEqual(row(productId), saved);
    revision = result.data.adminRevision;
  });
  await check('publication applies explicit inventory then unpublishing preserves stock', async () => {
    const result = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { action: 'publish', doc: { ...doc, price: 125 }, expectedAdminRevision: revision } });
    assert.equal(result.response.status, 200, result.data.error);
    revision = result.data.adminRevision;
    assert.equal(row(productId).status, 'published');
    assert.equal(row(productId).quantity, 10);
    const result2 = await request(`/api/admin/products/${productId}`, { method: 'PATCH', cookie,
      body: { action: 'unpublish', expectedAdminRevision: revision } });
    assert.equal(result2.response.status, 200, result2.data.error);
    revision = result2.data.adminRevision;
    assert.equal(row(productId).quantity, 10);
  });
  await check('real collection membership save and stale collection conflict', async () => {
    const result = await request('/api/admin/collections', { method: 'POST', cookie,
      body: { name: `Synthetic ${id}`, slug: `acceptance-${id}`, mode: 'manual', active: true, productIds: [productId] } });
    assert.equal(result.response.status, 201, result.data.error);
    const collection = result.data.collection; fixtures.collectionIds.push(collection.id);
    assert.deepEqual(collection.productIds, [productId]);
    const saved = await request(`/api/admin/collections/${collection.id}`, { method: 'PATCH', cookie,
      body: { name: 'Synthetic revised', expectedRevision: collection.revision } });
    assert.equal(saved.response.status, 200, saved.data.error);
    const stale = await request(`/api/admin/collections/${collection.id}`, { method: 'PATCH', cookie,
      body: { productIds: [], expectedRevision: collection.revision } });
    assert.equal(stale.response.status, 409);
    const reopened = await request(`/api/admin/collections/${collection.id}`, { cookie });
    assert.deepEqual(reopened.data.collection.productIds, [productId]);
  });
  await check('anonymous Storage write denied; service-role local fixture roundtrip', async () => {
    const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#207040' } }).png().toBuffer();
    const path = `/storage/v1/object/product-images/acceptance-${id}/fixture.png`;
    const denied = await runtime.apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: bytes }, 'anon');
    assert.ok([400, 401, 403].includes(denied.status));
    const uploaded = await runtime.apiFetch(path, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: bytes });
    assert.equal(uploaded.status, 200);
    const downloaded = await runtime.apiFetch(path.replace('/object/', '/object/public/'), {}, 'anon');
    assert.equal(downloaded.status, 200);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), bytes);
    await writeFile(join(stagingDirectory, 'synthetic-fixture.png'), bytes);
  });
} catch (error) {
  failure = error;
  // Assertions here contain only synthetic data and status codes, never secrets.
  console.error(JSON.stringify({ failedPhase: phase, lastRequest,
    actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined }));
} finally {
  for (const app of apps) app.kill(); // Exact owned processes only; no broad kill.
  const report = JSON.stringify({ results, fixtures, failedPhase: failure ? phase : undefined, lastRequest,
    passed: !failure, remaining: 'Concurrent/recovery/missing-RPC/native-media acceptance remains separate.' }, null, 2);
  await writeFile(join(stagingDirectory, `http-results-${id}.json`), report);
  await writeFile(join(stagingDirectory, 'http-results.json'), report);
}
if (failure) process.exitCode = 1;
