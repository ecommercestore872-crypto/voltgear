import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import net from 'node:net';
import { loadLocalRuntime, root, stagingDirectory, commandEnvironment } from './runtime.mjs';
import { requireLocalEndpoint } from './isolation.mjs';

// Real local HTTP + persisted-state acceptance. No route mocks, production data,
// provider credentials, database reset, fixture deletion, or remote endpoints.
const runtime = await loadLocalRuntime();
const admin = requireLocalEndpoint('http://127.0.0.1:3301', 3301);
const shop = requireLocalEndpoint('http://127.0.0.1:3300', 3300);
for (const directory of [root, join(root, 'apps/admin'), join(root, 'apps/storefront')]) {
  assert.ok(!(await readdir(directory)).some((name) => name.startsWith('.env') && !name.endsWith('.example')),
    'Application dotenv files forbidden');
}
const id = randomUUID();
const secret = randomUUID() + randomUUID();
const environment = { ...commandEnvironment(), NODE_ENV: 'development', NODE_OPTIONS: '--max-old-space-size=1024', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: runtime.api, NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY, ADMIN_TOKEN: secret, REVALIDATION_TOKEN: secret,
  ADMIN_AUTH_EMAILS: `commerce-${id}@example.invalid`, NEXT_PUBLIC_SITE_URL: shop,
  STOREFRONT_URL: shop, ADMIN_PUBLIC_URL: admin, ADMIN_PROXY_UPSTREAM: admin };
// The environment is constructed from an OS-only allowlist. These absent keys
// make actual email/advertising/Sheets/courier delivery unavailable to this run.
for (const key of ['RESEND_API_KEY', 'META_CONVERSIONS_API_ACCESS_TOKEN', 'TIKTOK_EVENTS_API_ACCESS_TOKEN',
  'TIKTOK_ACCESS_TOKEN', 'GOOGLE_ORDER_SYNC_URL', 'GOOGLE_ORDER_SYNC_SECRET', 'POSTEX_API_TOKEN']) {
  assert.equal(environment[key], undefined);
}
const apps = [];
const results = [];
const fixtures = { run: id, productIds: [], orderIds: [], reviewIds: [], localApi: runtime.api, admin, shop };
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let phase = 'startup';
let lastRequest;
let requestNumber = 0;
async function check(name, action) { phase = name; await action(); results.push({ name, passed: true }); console.log(`PASS: ${name}`); }
async function request(origin, path, { method = 'GET', body, authorized = false, headers = {} } = {}) {
  assert.ok([admin, shop].includes(origin));
  assert.ok(path.startsWith('/') && !path.startsWith('//') && !path.includes('\\'));
  const response = await fetch(`${origin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { 'Content-Type': 'application/json', Origin: origin,
      // Distinct synthetic local clients avoid making rate-limit exhaustion an
      // accidental dependency of the stock/concurrency assertions.
      'x-forwarded-for': `192.0.2.${(++requestNumber % 200) + 1}`,
      ...(authorized ? { Authorization: `Bearer ${secret}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  lastRequest = { path, method, status: response.status };
  return { status: response.status, data };
}
const adminRequest = (path, options = {}) => request(admin, path, { authorized: true, ...options });
const productRow = (productId) => JSON.parse(runtime.sql(`SELECT row_to_json(p) FROM products p WHERE id=${quote(productId)}::uuid;`));
const reviewRows = (productId) => JSON.parse(runtime.sql(`SELECT coalesce(json_agg(p ORDER BY id),'[]'::json) FROM product_reviews p WHERE product_id=${quote(productId)}::uuid;`));
const orderRow = (orderId) => JSON.parse(runtime.sql(`SELECT row_to_json(o) FROM orders o WHERE order_id=${quote(orderId)};`));
const orderCount = () => Number(runtime.sql(`SELECT count(*) FROM orders WHERE customer->>'email' LIKE ${quote(`commerce-${id}-%@example.invalid`)};`));
async function launch(name, port) {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); reject(new Error('Application port already occupied')); });
    socket.once('error', (error) => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve() : reject(new Error('Port ownership unavailable')); });
    socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Port ownership timeout')); });
  });
  const app = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', String(port)],
    { cwd: join(root, 'apps', name), env: environment, stdio: 'ignore' });
  apps.push(app);
  for (let attempt = 0; attempt < 90; attempt++) {
    assert.equal(app.exitCode, null, 'Owned app exited before readiness');
    try {
      const response = await fetch(`http://127.0.0.1:${port}${name === 'admin' ? '/admin/login' : '/robots.txt'}`,
        { redirect: 'error', signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch { /* bounded compilation wait */ }
    await sleep(1000);
  }
  assert.fail('Owned local app readiness timeout');
}
const category = runtime.sql('SELECT slug FROM categories WHERE active IS TRUE ORDER BY slug LIMIT 1;');
assert.ok(category);
const baseDoc = { name: `Commerce synthetic ${id}`, slug: `commerce-${id}`, category,
  price: 100, costPrice: 20, quantity: 10, stockStatus: 'in-stock', images: [], inventoryIntent: { mode: 'preserve' } };
const customer = (suffix) => ({ name: 'Synthetic acceptance', email: `commerce-${id}-${suffix}@example.invalid`,
  phone: '03001234567', address: 'Synthetic local fixture address', city: 'Lahore' });
const checkoutBody = (suffix, quantity = 1, price = 100) => ({
  items: [{ slug: baseDoc.slug, quantity, price }], customer: customer(suffix), payment: { method: 'cod' }, consent: 'none',
});
let productId;
let revision;
let firstOrder;
let secondOrder;
let failure;
try {
  await launch('storefront', 3300);
  await launch('admin', 3301);
  await check('machine bearer preserved; unauthenticated moderation denied', async () => {
    assert.equal((await adminRequest('/api/admin/products')).status, 200);
    assert.equal((await request(admin, '/api/admin/reviews', { method: 'PATCH', body: { id: randomUUID(), action: 'approve' } })).status, 401);
  });
  await check('create and publish product with tracked inventory through actual API', async () => {
    const created = await adminRequest('/api/admin/products', { method: 'POST', body: { doc: baseDoc } });
    assert.equal(created.status, 200);
    productId = created.data.id; fixtures.productIds.push(productId); revision = created.data.adminRevision;
    const published = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH',
      body: { action: 'publish', doc: { ...baseDoc, inventoryIntent: { mode: 'adjust',
        expectedRevision: created.data.inventoryRevision, quantity: 10, stockStatus: 'in-stock' } }, expectedAdminRevision: revision } });
    assert.equal(published.status, 200); revision = published.data.adminRevision;
    assert.equal(productRow(productId).quantity, 10); assert.equal(productRow(productId).status, 'published');
  });
  await check('invalid quantities and changed reviewed price create no order or stock change', async () => {
    const count = orderCount(); const before = productRow(productId);
    for (const quantity of [-1, 0, 1.5]) {
      const result = await request(shop, '/api/checkout', { method: 'POST', body: checkoutBody(`invalid-${quantity}`, quantity) });
      assert.equal(result.status, 400);
    }
    const mismatch = await request(shop, '/api/checkout', { method: 'POST', body: checkoutBody('price', 1, 1) });
    assert.equal(mismatch.status, 409); assert.equal(mismatch.data.code, 'PRICE_CHANGED');
    assert.equal(orderCount(), count); assert.deepEqual(productRow(productId), before);
  });
  let staleInventory;
  await check('two concurrent checkouts and content publish preserve sold inventory', async () => {
    staleInventory = String(productRow(productId).inventory_revision);
    const [one, two, publish] = await Promise.all([
      request(shop, '/api/checkout', { method: 'POST', body: checkoutBody('one', 2), headers: { 'Idempotency-Key': `commerce-${id}-one` } }),
      request(shop, '/api/checkout', { method: 'POST', body: checkoutBody('two', 3), headers: { 'Idempotency-Key': `commerce-${id}-two` } }),
      adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
        action: 'publish', doc: { ...baseDoc, shortDescription: 'Concurrent synthetic content' }, expectedAdminRevision: revision } }),
    ]);
    assert.equal(one.status, 200); assert.equal(two.status, 200); assert.equal(publish.status, 200);
    firstOrder = one.data.orderId; secondOrder = two.data.orderId;
    fixtures.orderIds.push(firstOrder, secondOrder); revision = publish.data.adminRevision;
    assert.notEqual(firstOrder, secondOrder); assert.equal(productRow(productId).quantity, 5);
    assert.equal(orderRow(firstOrder).subtotal, 200); assert.equal(orderRow(secondOrder).subtotal, 300);
    assert.equal(orderCount(), 2);
  });
  await check('checkout retry is idempotent without an extra order or stock decrement', async () => {
    const repeated = await request(shop, '/api/checkout', { method: 'POST', body: checkoutBody('one', 2),
      headers: { 'Idempotency-Key': `commerce-${id}-one` } });
    assert.equal(repeated.status, 200); assert.equal(repeated.data.orderId, firstOrder); assert.equal(repeated.data.replayed, true);
    assert.equal(orderCount(), 2); assert.equal(productRow(productId).quantity, 5);
  });
  await check('stale explicit inventory adjustment conflicts and cannot restock sold units', async () => {
    const before = productRow(productId);
    const result = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...baseDoc, quantity: 10, inventoryIntent: { mode: 'adjust',
        expectedRevision: staleInventory, quantity: 10, stockStatus: 'in-stock' } }, expectedAdminRevision: revision } });
    assert.equal(result.status, 409); assert.deepEqual(productRow(productId), before);
  });
  await check('wrong shopper cannot cancel; concurrent legitimate cancellation and publish restock once', async () => {
    const unauthorized = await request(shop, `/api/orders/${firstOrder}/cancel`, { method: 'POST', body: { email: `wrong-${id}@example.invalid` } });
    assert.equal(unauthorized.status, 404); assert.equal(productRow(productId).quantity, 5);
    const [cancel, publish] = await Promise.all([
      request(shop, `/api/orders/${firstOrder}/cancel`, { method: 'POST', body: { email: customer('one').email } }),
      adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
        action: 'publish', doc: { ...baseDoc, shortDescription: 'Cancellation content' }, expectedAdminRevision: revision } }),
    ]);
    assert.equal(cancel.status, 200); assert.equal(publish.status, 200); revision = publish.data.adminRevision;
    assert.equal(orderRow(firstOrder).status, 'cancelled'); assert.equal(productRow(productId).quantity, 7);
    const repeated = await request(shop, `/api/orders/${firstOrder}/cancel`, { method: 'POST', body: { email: customer('one').email } });
    // Cached preflight may reach the idempotent cancellation RPC again. Both
    // contracts must preserve the cancelled state and restore stock only once.
    assert.ok([200, 409].includes(repeated.status)); assert.equal(orderRow(firstOrder).status, 'cancelled');
    assert.equal(productRow(productId).quantity, 7);
  });
  let submissionId;
  let approved;
  await check('real shopper review submission remains pending until moderation', async () => {
    const result = await request(shop, '/api/reviews', { method: 'POST', body: { slug: baseDoc.slug, rating: 4,
      name: 'Synthetic reviewer', email: customer('two').email, comment: 'Isolated acceptance review only.' } });
    assert.equal(result.status, 200); assert.equal(result.data.verified, true);
    submissionId = runtime.sql(`SELECT id FROM review_submissions WHERE product_id=${quote(productId)}::uuid AND email=${quote(customer('two').email)};`);
    assert.match(submissionId, /^[0-9a-f-]{36}$/); fixtures.reviewIds.push(submissionId);
    assert.deepEqual(reviewRows(productId), []);
    // Unreviewed products retain nullable legacy aggregates; pending review
    // submission must not manufacture a published review, rating or count.
    assert.ok([null, 0].includes(productRow(productId).review_count));
    assert.equal(productRow(productId).rating, null);
  });
  await check('review approval concurrent with publishing preserves identity and rating aggregates', async () => {
    const [moderate, publish] = await Promise.all([
      adminRequest('/api/admin/reviews', { method: 'PATCH', body: { id: submissionId, action: 'approve', reply: 'Synthetic reply.' } }),
      adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
        action: 'publish', doc: { ...baseDoc, reviews: [], rating: null, reviewCount: 0 }, expectedAdminRevision: revision } }),
    ]);
    assert.equal(moderate.status, 200); assert.equal(publish.status, 200); revision = publish.data.adminRevision;
    approved = reviewRows(productId); assert.equal(approved.length, 1); assert.equal(approved[0].submission_id, submissionId);
    assert.equal(approved[0].rating, 4); assert.equal(approved[0].reply, 'Synthetic reply.');
    assert.equal(productRow(productId).review_count, 1); assert.equal(productRow(productId).rating, 4);
    const again = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...baseDoc, reviews: [], reviewCount: 0, rating: 0 }, expectedAdminRevision: revision } });
    assert.equal(again.status, 200); revision = again.data.adminRevision;
    assert.deepEqual(reviewRows(productId), approved); assert.equal(productRow(productId).quantity, 7);
  });
  await check('stale content save and malformed update leave committed state intact; subsequent update succeeds', async () => {
    const before = productRow(productId);
    const malformed = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      doc: { ...baseDoc, price: 'invalid' }, expectedAdminRevision: revision } });
    assert.equal(malformed.status, 400); assert.deepEqual(productRow(productId), before);
    const staleRevision = revision;
    const saved = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      doc: { ...baseDoc, shortDescription: 'Recovered save' }, expectedAdminRevision: revision } });
    assert.equal(saved.status, 200); revision = saved.data.adminRevision;
    const committed = productRow(productId);
    const stale = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      doc: { ...baseDoc, name: 'Stale browser editor' }, expectedAdminRevision: staleRevision } });
    assert.equal(stale.status, 409); assert.deepEqual(productRow(productId), committed);
    assert.deepEqual(reviewRows(productId), approved); assert.equal(productRow(productId).quantity, 7);
  });
  await check('warm local catalog read reflects publish through cross-app invalidation', async () => {
    const path = `/api/store/products?slugs=${encodeURIComponent(baseDoc.slug)}`;
    const warm = await request(shop, path); assert.equal(warm.status, 200);
    assert.ok(warm.data.some((product) => product.slug === baseDoc.slug && product.name === baseDoc.name));
    const newName = `Commerce updated ${id}`;
    const publish = await adminRequest(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...baseDoc, name: newName }, expectedAdminRevision: revision } });
    assert.equal(publish.status, 200); revision = publish.data.adminRevision;
    let reflected = false;
    for (let attempt = 0; attempt < 15; attempt++) {
      const reread = await request(shop, path); assert.equal(reread.status, 200);
      if (reread.data.some((product) => product.slug === baseDoc.slug && product.name === newName)) { reflected = true; break; }
      await sleep(1000);
    }
    assert.ok(reflected, 'Local warmed catalog did not reflect publication');
    assert.equal(productRow(productId).quantity, 7); assert.deepEqual(reviewRows(productId), approved);
  });
  await check('admin cancellation API preserves bearer integrations and restores remaining stock once', async () => {
    const cancelled = await adminRequest(`/api/orders/${secondOrder}/status`, { method: 'POST', body: { status: 'cancelled', note: 'Synthetic local acceptance.' } });
    assert.equal(cancelled.status, 200); assert.equal(orderRow(secondOrder).status, 'cancelled');
    assert.equal(productRow(productId).quantity, 10);
    const repeated = await adminRequest(`/api/orders/${secondOrder}/status`, { method: 'POST', body: { status: 'cancelled' } });
    assert.ok([200, 409].includes(repeated.status)); assert.equal(productRow(productId).quantity, 10);
  });
  await check('competing HTTP checkouts cannot sell the same final inventory unit twice', async () => {
    const doc = { ...baseDoc, name: `Last-unit synthetic ${id}`, slug: `last-unit-${id}`, quantity: 1 };
    const created = await adminRequest('/api/admin/products', { method: 'POST', body: { doc } });
    assert.equal(created.status, 200); const lastProductId = created.data.id; fixtures.productIds.push(lastProductId);
    const published = await adminRequest(`/api/admin/products/${lastProductId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...doc, inventoryIntent: { mode: 'adjust', expectedRevision: created.data.inventoryRevision,
        quantity: 1, stockStatus: 'in-stock' } }, expectedAdminRevision: created.data.adminRevision } });
    assert.equal(published.status, 200);
    const beforeCount = orderCount();
    const competing = await Promise.all(['last-a', 'last-b'].map((suffix) => request(shop, '/api/checkout', {
      method: 'POST', body: { ...checkoutBody(suffix), items: [{ slug: doc.slug, quantity: 1, price: 100 }] },
      headers: { 'Idempotency-Key': `commerce-${id}-${suffix}` },
    })));
    assert.deepEqual(competing.map((result) => result.status).sort(), [200, 400]);
    fixtures.orderIds.push(competing.find((result) => result.status === 200).data.orderId);
    assert.equal(orderCount(), beforeCount + 1); assert.equal(productRow(lastProductId).quantity, 0);
    assert.equal(productRow(lastProductId).stock_status, 'out-of-stock');
  });
} catch (error) {
  failure = error;
  console.error(JSON.stringify({ failedPhase: phase, lastRequest,
    actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined }));
} finally {
  for (const app of apps) app.kill();
  const report = JSON.stringify({ passed: !failure, results, fixtures, failedPhase: failure ? phase : undefined, lastRequest,
    scope: 'Actual local Next development servers + Auth/PostgREST/PostgreSQL. Concurrent HTTP requests overlap, but lock ordering is covered separately by retained SQL tests. Local data-cache invalidation only; CDN/immutable production build/hydration not certified.' }, null, 2);
  await writeFile(join(stagingDirectory, `commerce-results-${id}.json`), report);
  await writeFile(join(stagingDirectory, 'commerce-results.json'), report);
}
if (failure) process.exitCode = 1;
