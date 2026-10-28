import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { projectId, requireLocalEndpoint } from './isolation.mjs';
import { config } from './config.mjs';

// This script prepares local files only. No Supabase link, remote push, or DB reset.
const root = fileURLToPath(new URL('../../', import.meta.url));
const target = join(root, 'tmp', 'isolated-staging');
const marker = join(target, 'OWNER');
await mkdir(target, { recursive: true });
let existing;
try { existing = await readFile(marker, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (existing) assert.equal(existing, projectId, 'Refusing foreign staging directory');
else {
  assert.equal((await readdir(target)).length, 0, 'Refusing nonempty unowned staging directory');
  await writeFile(marker, projectId, { flag: 'wx' });
}
const api = requireLocalEndpoint('http://127.0.0.1:55321', 55321);
await mkdir(join(target, 'supabase', 'migrations'), { recursive: true });
const source = join(root, 'supabase', 'migrations');
const names = (await readdir(source)).filter((name) => /^\d+_.+\.sql$/.test(name)).sort();
assert.equal(new Set(names.map((name) => name.split('_')[0])).size, names.length, 'Duplicate migration versions');
const old = await readdir(join(target, 'supabase', 'migrations'));
assert.ok(old.every((name) => names.includes(name)), 'Unexpected staging migration; inspect manually');
const manifest = [];
for (const name of names) {
  const bytes = await readFile(join(source, name));
  await writeFile(join(target, 'supabase', 'migrations', name), bytes);
  manifest.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(join(target, 'supabase', 'config.toml'), config);
await writeFile(join(target, 'migration-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ prepared: true, projectId, api, migrations: names.length,
  linked: false, seedEnabled: false, credentialsCopied: false, target }));
