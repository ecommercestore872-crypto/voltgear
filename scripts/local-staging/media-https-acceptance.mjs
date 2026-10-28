import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';
import { localAppEnvironment, startLocalApp } from './local-app.mjs';
import { startHttpsMedia } from './https-media.mjs';

const runtime = await loadLocalRuntime();
const id = randomUUID(); const email = `media-${id}@example.invalid`; const secret = randomUUID() + randomUUID();
const admin = 'http://127.0.0.1:3301';
const folder = `acceptance-https-${id}`; const results = [];
let tls; let app; let phase = 'setup'; let failure; let productId;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const count = () => Number(runtime.sql(`SELECT count(*) FROM storage.objects WHERE bucket_id='product-images' AND name LIKE '${folder}/%';`));
const check = async (name, action) => { phase = name; await action(); results.push({ name, passed: true }); console.log(`PASS: ${name}`); };
async function request(path, { method = 'GET', body } = {}) {
  return fetch(`${admin}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { Origin: admin, Authorization: `Bearer ${secret}`, ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }) });
}
async function upload(bytes, name) {
  const form = new FormData(); form.set('file', new File([bytes], name, { type: 'image/png' })); form.set('folder', folder);
  return request('/api/admin/upload', { method: 'POST', body: form });
}
try {
  tls = await startHttpsMedia(runtime);
  app = await startLocalApp('admin', localAppEnvironment(runtime, { email, secret, httpsCa: tls.caPath }));
  const images = [];
  await check('multiple actual admin uploads return HTTPS URLs; strict certificate and byte checks pass', async () => {
    assert.equal(count(), 0);
    for (const [index, background] of ['#207040', '#4040a0'].entries()) {
      const bytes = await sharp({ create: { width: 32, height: 32, channels: 3, background } }).png().toBuffer();
      await writeFile(join(stagingDirectory, `synthetic-https-${index}.png`), bytes);
      const response = await upload(bytes, `synthetic-${index}.png`); assert.equal(response.status, 200);
      const media = await response.json(); assert.ok(media.secureUrl.startsWith(`${tls.origin}/storage/v1/object/public/product-images/${folder}/`));
      const download = await tls.get(media.secureUrl); assert.equal(download.status, 200); assert.equal(download.authorized, true);
      assert.ok(download.bytes.equals(bytes)); images.push(media.secureUrl);
    }
    assert.equal(count(), 2);
  });
  await check('invalid and oversized media rejected without extra objects', async () => {
    assert.equal((await upload(Buffer.from('not an image'), 'invalid.png')).status, 400);
    assert.equal((await upload(Buffer.alloc(4_000_001), 'oversized.png')).status, 413); assert.equal(count(), 2);
  });
  const doc = { name: `HTTPS media ${id}`, slug: `https-media-${id}`, price: 100, quantity: 3,
    category: runtime.sql('SELECT slug FROM categories ORDER BY slug LIMIT 1;'), stockStatus: 'in-stock', images };
  let revision;
  await check('HTTPS image order survives draft save/reopen/reorder/publish and live persistence', async () => {
    const created = await request('/api/admin/products', { method: 'POST', body: { doc } }); assert.equal(created.status, 200);
    const data = await created.json(); productId = data.id; revision = data.adminRevision;
    const reopened = await (await request(`/api/admin/products/${productId}`)).json(); assert.deepEqual(reopened.product.draft.images, images);
    const reversed = [...images].reverse();
    const publish = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...doc, images: reversed }, expectedAdminRevision: revision } }); assert.equal(publish.status, 200);
    revision = (await publish.json()).adminRevision;
    const actual = JSON.parse(runtime.sql(`SELECT json_agg(url ORDER BY sort_order) FROM product_images WHERE product_id=${quote(productId)}::uuid;`));
    assert.deepEqual(actual, reversed);
    for (const url of actual) assert.equal((await tls.get(url)).status, 200);
  });
  await check('shared-image unlink never purges bytes; permanent delete remains denied', async () => {
    const shared = await request('/api/admin/products', { method: 'POST', body: { doc: { ...doc, name: 'Shared synthetic media', slug: `https-shared-${id}` } } });
    assert.equal(shared.status, 200);
    const unlinked = await request(`/api/admin/products/${productId}`, { method: 'PATCH', body: {
      action: 'publish', doc: { ...doc, images: [] }, expectedAdminRevision: revision } }); assert.equal(unlinked.status, 200);
    const deletion = await request('/api/admin/upload', { method: 'DELETE', body: { publicId: `${folder}/synthetic-0.png` } });
    assert.equal(deletion.status, 409); assert.equal(count(), 2);
    for (const url of images) assert.equal((await tls.get(url)).status, 200);
  });
} catch (error) {
  failure = true; console.error(JSON.stringify({ failedPhase: phase, actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined }));
} finally {
  await app?.close(); await tls?.close();
  await writeFile(join(stagingDirectory, 'media-https-results.json'), JSON.stringify({ passed: !failure, results, productId,
    nativeSelectionCertified: false, browserCertificateTrustCertified: false, systemTrustStoreChanged: false,
    tlsValidationDisabled: false, fixtureFolder: folder, certSha256: tls ? createHash('sha256').update(await import('node:fs/promises').then((fs) => fs.readFile(tls.caPath))).digest('hex') : undefined }, null, 2));
}
if (failure) process.exitCode = 1;
