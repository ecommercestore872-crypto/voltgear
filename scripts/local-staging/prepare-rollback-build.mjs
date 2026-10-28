import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, realpath, lstat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { root, stagingDirectory, loadLocalRuntime } from './runtime.mjs';
import { isolatedProcessEnvironment } from './isolation.mjs';

assert.deepEqual(process.argv.slice(2), process.argv.includes('--build') ? ['--build'] : []);
const build = process.argv.includes('--build');
const runId = randomUUID(), destination = join(stagingDirectory, `rollback-build-${runId}`);
const snapshot = join(destination, 'source');
await mkdir(snapshot, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env: isolatedProcessEnvironment() });
const files = git(['ls-files', '-z']).split('\0').filter(Boolean).filter((file) =>
  file.startsWith('apps/admin/') || file.startsWith('packages/shared/') || !file.includes('/'));
const hydration = ['packages/shared/components/admin/admin-hydration-boundary.tsx',
  'packages/shared/lib/admin-document-ready.ts', 'packages/shared/lib/admin-document-ready.test.ts',
  'apps/admin/app/admin/hydration-boundary.test.ts'];
const copied = [...new Set([...files, ...hydration])].filter((file) =>
  !/(^|\/)(?:\.env(?:\.|$)|\.git(?:\/|$)|node_modules(?:\/|$)|\.next(?:\/|$))/.test(file));
const report = { runId, kind: 'distinct-conservative-admin-rollback', baseHead: git(['rev-parse', 'HEAD']).trim(),
  createdAt: new Date().toISOString(), snapshot, files: {}, buildExecuted: false, passed: false,
  limitation: 'New recovery candidate; not an earlier hosted known-good deployment. Requires separate switch/auth/data/browser validation.' };
const save = () => writeFile(join(destination, 'manifest.json'), JSON.stringify(report, null, 2));
for (const file of copied) {
  const source = resolve(root, file), target = resolve(snapshot, file);
  assert.ok(source.startsWith(resolve(root) + '\\') && target.startsWith(resolve(snapshot) + '\\'));
  assert.equal((await lstat(source)).isSymbolicLink(), false, 'No source links copied');
  await mkdir(dirname(target), { recursive: true });
  const bytes = await readFile(source); report.files[file] = { sourceSha256: hash(bytes) };
  await writeFile(target, bytes, { flag: 'wx' });
}
const variantFile = 'packages/shared/components/admin/admin-hydration-boundary.tsx';
const original = await readFile(join(snapshot, variantFile), 'utf8');
const needle = 'return Array.isArray(reveals) && reveals.length > 0;';
assert.equal(original.split(needle).length, 2, 'Reviewed variant predicate changed');
await writeFile(join(snapshot, variantFile), original.replace(needle,
  'return document.readyState !== "complete" || (Array.isArray(reveals) && reveals.length > 0);'));
report.variant = { file: variantFile, behavior: 'Wait for document complete AND no queued reveals; deliberately slower conservative recovery.',
  sha256: hash(await readFile(join(snapshot, variantFile))) };
assert.notEqual(report.variant.sha256, report.files[variantFile].sourceSha256);
const dependencyDirectory = await realpath(join(root, 'node_modules'));
assert.equal(dependencyDirectory, resolve(root, 'node_modules'));
// Snapshot lives below the worktree, so Node resolves these existing dependencies
// through its ordinary ancestor lookup. No junction or permission override needed.
report.dependencies = { directory: dependencyDirectory, mode: 'normal ancestor module resolution' };
await save();
if (build) {
  const runtime = await loadLocalRuntime();
  const environment = { ...isolatedProcessEnvironment(), NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=1536',
    NEXT_TELEMETRY_DISABLED: '1', ADMIN_TOKEN: randomUUID() + randomUUID(),
    NEXT_PUBLIC_SUPABASE_URL: runtime.api, NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3300' };
  let log = '';
  const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'build'],
    { cwd: join(snapshot, 'apps/admin'), env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { log += chunk; });
  const exitCode = await new Promise((resolveExit, reject) => { child.once('error', reject); child.once('exit', resolveExit); });
  for (const value of [environment.ADMIN_TOKEN, runtime.values.ANON_KEY, runtime.values.SERVICE_ROLE_KEY]) log = log.replaceAll(value, '[local value redacted]');
  await writeFile(join(destination, 'build.log'), log);
  report.buildExecuted = true; report.exitCode = exitCode;
  if (exitCode === 0) {
    report.buildId = (await readFile(join(snapshot, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim();
    report.candidateBuildId = (await readFile(join(root, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim();
    assert.notEqual(report.buildId, report.candidateBuildId);
    report.passed = true;
  }
  await save(); if (exitCode !== 0) process.exitCode = 1;
}
// Confirm the source tree and original compiled artifacts were not replaced.
for (const [file, value] of Object.entries(report.files)) assert.equal(hash(await readFile(join(root, file))), value.sourceSha256);
await save();
console.log(JSON.stringify({ manifest: join(destination, 'manifest.json'), snapshotPrepared: true,
  buildExecuted: report.buildExecuted, buildPassed: report.passed, buildId: report.buildId }));
