import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { root, stagingDirectory, loadLocalRuntime } from './runtime.mjs';
import { localAppEnvironment, startLocalApp, requireFreePort } from './local-app.mjs';
import { isolatedProcessEnvironment } from './isolation.mjs';

// Exact local prepared build only; no hosted URL or production credential mode.
assert.equal(process.argv.length, 3);
const manifestPath = resolve(process.argv[2]);
assert.ok(manifestPath.startsWith(resolve(stagingDirectory) + '\\rollback-build-') && manifestPath.endsWith('\\manifest.json'));
assert.equal(await realpath(manifestPath), manifestPath);
const candidate = JSON.parse(await readFile(manifestPath, 'utf8'));
assert.equal(candidate.kind, 'distinct-conservative-admin-rollback');
assert.equal(candidate.buildExecuted, true); assert.equal(candidate.passed, true);
assert.ok(candidate.snapshot.startsWith(resolve(stagingDirectory) + '\\rollback-build-'));
const hash = (value) => createHash('sha256').update(value).digest('hex');
for (const [file, details] of Object.entries(candidate.files)) {
  assert.equal(hash(await readFile(join(root, file))), details.sourceSha256, 'A source changed since snapshot');
  assert.equal(hash(await readFile(join(candidate.snapshot, file))), file === candidate.variant.file ? candidate.variant.sha256 : details.sourceSha256,
    'B must differ only by its recorded conservative hydration predicate');
}
const runtime = await loadLocalRuntime(), runId = randomUUID();
const report = { runId, startedAt: new Date().toISOString(), manifestPath,
  candidateAdminBuild: candidate.candidateBuildId, rollbackAdminBuild: candidate.buildId,
  results: [], errors: [], passed: false,
  scope: 'Distinct local admin A→B switch, synthetic persisted data and server cookie checks. Not hosted traffic/protection or native-picker acceptance.' };
const output = join(stagingDirectory, `distinct-rollback-${runId}.json`);
const secret = randomUUID() + randomUUID(), email = `rollback-${runId}@example.invalid`, password = randomUUID() + randomUUID();
const environment = localAppEnvironment(runtime, { email, secret });
const admin = 'http://127.0.0.1:3301', shop = 'http://127.0.0.1:3300';
let app, storefront, browser, phase = 'setup', cookie, productId, revision, requestId = 0;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const check = async (name, action) => { phase = name; await action(); report.results.push({ name, passed: true }); await save(); };
const save = () => writeFile(output, JSON.stringify(report, null, 2));
async function request(path, { method = 'GET', body, credential = cookie } = {}) {
  assert.ok(path.startsWith('/') && !path.startsWith('//'));
  const response = await fetch(admin + path, { method, redirect: 'manual', signal: AbortSignal.timeout(90000),
    headers: { 'Content-Type': 'application/json', Origin: admin, 'x-forwarded-for': `192.0.2.${(++requestId % 200) + 1}`,
      ...(credential ? { Cookie: credential } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  report.lastRequest = { path, method, status: response.status }; return response;
}
async function login() {
  const response = await request('/api/admin/login', { method: 'POST', body: { email, password }, credential: '' });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /secure/i);
  const value = response.headers.get('set-cookie').split(';')[0]; assert.match(decodeURIComponent(value), /^vg_admin=v2\.[a-f0-9]{64}$/); return value;
}
const row = () => JSON.parse(runtime.sql(`SELECT row_to_json(p) FROM products p WHERE id=${quote(productId)}::uuid;`));
const reviews = () => runtime.sql(`SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY id),'[]') FROM product_reviews r WHERE product_id=${quote(productId)}::uuid;`);
const digest = () => hash(JSON.stringify(row()) + reviews() + runtime.sql(`SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY collection_id),'[]') FROM collection_products c WHERE product_id=${quote(productId)}::uuid;`));
function readFreshStorefront(path) {
  // This test performs synchronous Docker SQL between HTTP calls. Use a dedicated
  // local socket, avoiding pooled readiness connections that may close while the
  // test event loop is blocked. No retries or application transport changes.
  assert.ok(path.startsWith('/product/') && !path.includes('..'));
  return new Promise((resolveResponse, reject) => {
    const request = http.get(shop + path, { agent: false }, (response) => {
      let body = '';
      response.setEncoding('utf8'); response.on('data', (chunk) => { body += chunk; if (body.length > 16 * 1024 * 1024) request.destroy(new Error('Local response too large')); });
      response.on('error', reject);
      response.on('end', () => resolveResponse({ status: response.statusCode, body, reusedSocket: request.reusedSocket }));
    });
    request.setTimeout(90000, () => request.destroy(new Error('Local storefront timeout'))); request.on('error', reject);
  });
}
async function startB() {
  await requireFreePort(3301);
  for (const directory of [candidate.snapshot, join(candidate.snapshot, 'apps/admin')]) assert.ok(!(await readdir(directory)).some((name) => name.startsWith('.env') && !name.endsWith('.example')));
  const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '3301'],
    { cwd: join(candidate.snapshot, 'apps/admin'), env: { ...environment, NODE_ENV: 'production' }, stdio: ['ignore', 'ignore', 'ignore'] });
  const close = async () => { if (child.exitCode === null) { const ended = new Promise((resolveExit) => child.once('exit', resolveExit)); child.kill(); await ended; } };
  try {
    for (let i = 0; i < 60; i++) {
      assert.equal(child.exitCode, null);
      try { if ((await fetch(admin + '/admin/login', { signal: AbortSignal.timeout(2000) })).ok) return { close }; } catch { /* bounded readiness */ }
      await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
    }
    throw new Error('Owned B readiness timeout');
  } catch (error) { await close(); throw error; }
}
try {
  assert.equal((await readFile(join(root, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim(), candidate.candidateBuildId);
  assert.equal((await readFile(join(candidate.snapshot, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim(), candidate.buildId);
  assert.notEqual(candidate.candidateBuildId, candidate.buildId);
  const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(created.status, 200);
  app = await startLocalApp('admin', environment, { productionBuild: true });
  storefront = await startLocalApp('storefront', environment, { productionBuild: true });
  cookie = await login();
  const doc = { name: 'Synthetic distinct rollback', slug: `distinct-rollback-${runId}`, price: 100, costPrice: 20,
    category: runtime.sql('SELECT slug FROM categories ORDER BY slug LIMIT 1;'), quantity: 10, stockStatus: 'in-stock', images: [] };
  await check('A creates/publishes fixture; actual checkout and review moderation preserve independent state', async () => {
    const create = await request('/api/admin/products', { method: 'POST', body: { doc } }); assert.equal(create.status, 200);
    const value = await create.json(); productId = value.id; revision = value.adminRevision;
    const publish = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: { action: 'publish', expectedAdminRevision: revision,
      doc: { ...doc, inventoryIntent: { mode: 'adjust', expectedRevision: value.inventoryRevision, quantity: 10, stockStatus: 'in-stock' } } } });
    assert.equal(publish.status, 200); revision = (await publish.json()).adminRevision;
    const orderId = `rollback-${runId}`, submission = randomUUID(); report.fixtures = { productId, orderId, submission };
    const collection = randomUUID(); report.fixtures.collectionId = collection;
    runtime.sql(`SELECT public.checkout_place_order(${quote(orderId)},'{"email":"synthetic@example.invalid"}','cod',100,0,100,0,NULL,false,
      ${quote(JSON.stringify([{ slug: doc.slug, name: doc.name, price: 100, quantity: 1, lineTotal: 100 }]))}::jsonb,NULL,NULL);
      INSERT INTO collections(id,name,slug,mode) VALUES ('${collection}','Synthetic rollback membership','rollback-${runId}','manual');
      INSERT INTO collection_products(collection_id,product_id,sort_order) VALUES ('${collection}','${productId}',0);
      INSERT INTO review_submissions(id,product_id,name,rating,comment) VALUES ('${submission}','${productId}','Synthetic reviewer',4,'Rollback test only');
      SELECT admin_moderate_review('${submission}','approve','Synthetic reply');`);
    assert.equal(row().quantity, 9); assert.equal(row().rating, 4); assert.equal(row().review_count, 1);
  });
  await check('distinct A→B process switch retains data and v2 cookie while legacy cookie stays denied', async () => {
    const before = digest(); await app.close(); app = undefined; await requireFreePort(3301); app = await startB();
    assert.equal((await request('/api/admin/products')).status, 200); assert.equal(digest(), before);
    const legacy = createHmac('sha256', secret).update('voltgear-admin-session-v1').digest('hex');
    assert.equal((await request('/api/admin/products', { credential: `vg_admin=${legacy}` })).status, 401);
  });
  await check('B preserves sold stock/reviews on content publish; stale inventory cannot restock', async () => {
    const beforeReviews = reviews(), beforeInventory = String(row().inventory_revision);
    const update = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: { action: 'publish', expectedAdminRevision: revision,
      doc: { ...doc, name: 'Synthetic B publication', reviews: [], rating: 0, reviewCount: 0, inventoryIntent: { mode: 'preserve' } } } });
    assert.equal(update.status, 200); revision = (await update.json()).adminRevision;
    assert.equal(row().quantity, 9); assert.equal(reviews(), beforeReviews);
    assert.equal(runtime.sql(`SELECT count(*) FROM collection_products WHERE collection_id='${report.fixtures.collectionId}' AND product_id='${productId}';`), '1');
    const staleContentBefore = digest();
    const staleContent = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: { action: 'save', expectedAdminRevision: '0', doc } });
    assert.equal(staleContent.status, 409); assert.equal(digest(), staleContentBefore);
    runtime.sql(`SELECT cancel_order_restore_inventory(${quote(report.fixtures.orderId)},'Synthetic rollback cancellation');`);
    assert.equal(row().quantity, 10);
    const before = digest();
    const stale = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: { action: 'publish', expectedAdminRevision: revision,
      doc: { ...doc, quantity: 99, inventoryIntent: { mode: 'adjust', expectedRevision: beforeInventory, quantity: 99, stockStatus: 'in-stock' } } } });
    assert.equal(stale.status, 409); assert.equal(digest(), before);
    const visible = await readFreshStorefront('/product/' + doc.slug); assert.equal(visible.status, 200);
    assert.equal(visible.reusedSocket, false); assert.ok(visible.body.includes('Synthetic B publication'));
    report.storefrontFreshSocket = true; report.storefrontState = storefront.state();
  });
  await check('B fails closed during safe writer outage and revokes copied v2 cookies', async () => {
    const before = digest();
    try {
      runtime.sql('REVOKE EXECUTE ON FUNCTION public.admin_write_product_v2(text,uuid,jsonb,jsonb,bigint) FROM service_role;');
      const response = await request('/api/admin/products', { method: 'POST', body: { doc: { ...doc, slug: 'outage-' + runId } } });
      assert.equal(response.status, 503); assert.equal(digest(), before);
    } finally { runtime.sql('GRANT EXECUTE ON FUNCTION public.admin_write_product_v2(text,uuid,jsonb,jsonb,bigint) TO service_role;'); }
    assert.equal((await request('/api/admin/logout', { method: 'POST' })).status, 200);
    assert.equal((await request('/api/admin/products')).status, 401); cookie = await login();
  });
  await check('B production rendering retains SSR inputs on desktop/mobile without418 or RS', async () => {
    browser = await chromium.launch({ channel: 'chrome', headless: true, env: isolatedProcessEnvironment() });
    report.browserAuthorization = 'Ephemeral local machine bearer; cookie server behavior tested separately; no native browser-cookie/TLS acceptance implied.';
    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    await context.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { window.__rollbackSSRInput = document.getElementById('price'); }, { once: true }));
    await context.route('**/*', (route) => new URL(route.request().url()).origin === admin
      ? route.continue({ headers: { ...route.request().headers(), authorization: 'Bearer ' + secret } }) : route.abort('blockedbyclient'));
    const page = await context.newPage(); page.on('pageerror', () => report.errors.push('Production browser runtime error'));
    const before = digest();
    for (let i = 0; i < 10; i++) {
      await page.setViewportSize({ width: i < 5 ? 1440 : 390, height: 900 });
      await page.goto(admin + '/admin/products/' + productId, { waitUntil: 'load' });
      await page.getByRole('button', { name: 'Upload File', exact: true }).first().waitFor();
      assert.equal(await page.locator('#price').inputValue(), '100');
      assert.equal(await page.evaluate(() => window.__rollbackSSRInput === document.getElementById('price')), true);
    }
    assert.equal(report.errors.length, 0); assert.equal(digest(), before); await browser.close(); browser = undefined;
  });
  report.passed = true;
} catch (error) {
  const sensitive = /password|cookie|token|authorization|bearer|secret/i.test(error.message);
  report.failure = { phase, name: error.name, actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined,
    message: sensitive ? '[sensitive diagnostic suppressed]' : error.message.slice(0, 250),
    causeCode: error.cause?.code, storefrontDiagnostic: storefront?.diagnostic?.(), storefrontState: storefront?.state?.() };
  process.exitCode = 1;
} finally {
  const cleanupErrors = []; for (const [name, resource] of [['browser', browser], ['admin', app], ['storefront', storefront]]) {
    try { await resource?.close(); } catch { cleanupErrors.push(name); }
  }
  for (const port of [3300, 3301]) try { await requireFreePort(port); } catch { cleanupErrors.push(`port ${port}`); }
  report.cleanupErrors = cleanupErrors; report.passed &&= cleanupErrors.length === 0;
  report.finishedAt = new Date().toISOString(); await save(); if (!report.passed) process.exitCode = 1;
  console.log(JSON.stringify({ output, passed: report.passed, checks: report.results.length, failure: report.failure, cleanupErrors }));
}
