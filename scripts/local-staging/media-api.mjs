import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';

const runtime = await loadLocalRuntime();
const admin = 'http://127.0.0.1:3301';
const input = JSON.parse(await readFile(join(stagingDirectory, 'browser-input.json'), 'utf8'));
assert.match(input.email, /^browser-[0-9a-f-]+@example\.invalid$/);
const login = await fetch(`${admin}/api/admin/login`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90_000),
  headers: { 'Content-Type': 'application/json', Origin: admin }, body: JSON.stringify(input) });
assert.equal(login.status, 200);
const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
const bytes = await readFile(join(stagingDirectory, 'synthetic-fixture.png'));
const folder = `acceptance-media-${randomUUID()}`;
const count = () => Number(runtime.sql(`SELECT count(*) FROM storage.objects WHERE bucket_id='product-images' AND name LIKE '${folder}/%';`));
const report = { native: false, fixtureSha256: createHash('sha256').update(bytes).digest('hex'), folder };
async function upload(fileBytes, filename) {
  const form = new FormData(); form.set('file', new File([fileBytes], filename, { type: 'image/png' })); form.set('folder', folder);
  return fetch(`${admin}/api/admin/upload`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90_000),
    headers: { Origin: admin, Cookie: cookie }, body: form });
}
assert.equal(count(), 0);
const valid = await upload(bytes, 'synthetic.png');
report.validUploadStatus = valid.status;
report.storedAfterUpload = count();
console.log(JSON.stringify({ native: false, validUploadStatus: valid.status, storedAfterUpload: report.storedAfterUpload }));
const invalid = await upload(Buffer.from('not-a-real-image'), 'invalid.png');
assert.equal(invalid.status, 400); assert.equal(count(), report.storedAfterUpload);
report.invalidRejected400 = true;
console.log('PASS: corrupt image rejected HTTP400 without storing extra objects.');
const oversized = await upload(Buffer.alloc(4_000_001), 'oversized.png');
assert.equal(oversized.status, 413); assert.equal(count(), report.storedAfterUpload);
report.oversizedRejected413 = true;
console.log('PASS: oversized image rejected HTTP413 without storing extra objects.');
const deletion = await fetch(`${admin}/api/admin/upload`, { method: 'DELETE', redirect: 'error', signal: AbortSignal.timeout(30_000),
  headers: { Origin: admin, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ publicId: `${folder}/synthetic.png` }) });
assert.equal(deletion.status, 409); assert.equal(count(), report.storedAfterUpload);
report.permanentDeleteDenied409 = true;
console.log('PASS: permanent-delete safeguard returns HTTP409 and preserves bytes.');
await writeFile(join(stagingDirectory, 'media-api-results.json'), JSON.stringify(report, null, 2));
if (valid.status !== 200) { console.error('UNRESOLVED: accepted storage bytes did not produce an accepted admin-upload response; native end-to-end not certified.'); process.exitCode = 1; }
