import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { isolatedProcessEnvironment, projectId, requireOwnedLocalDocker, requireMigrationInventory, safeStartupDiagnostics, requireSafeCliCache } from './isolation.mjs';
import { config as expectedConfig } from './config.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = join(root, 'tmp', 'isolated-staging');
const env = isolatedProcessEnvironment();
const context = 'desktop-linux';
const network = `${projectId}-loopback`;
function run(binary, args, timeout = 20_000) {
  const result = spawnSync(binary, args, { cwd: target, env, encoding: 'utf8', timeout });
  if (result.error || result.status !== 0) {
    const summary = safeStartupDiagnostics(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
    if (summary) console.error(summary);
  }
  // Never echo captured CLI output: startup/status can include local secrets.
  assert.ok(!result.error && result.status === 0,
    `${binary} ${args[0]} failed (exit ${result.status ?? 'unavailable'}, ${result.error?.code ?? 'command error'}); no credentials logged`);
  return result.stdout;
}
function docker(args) { return run('docker', ['--context', context, ...args]); }
assert.equal(await readFile(join(target, 'OWNER'), 'utf8'), projectId);
const files = await readdir(join(target, 'supabase'));
assert.ok(!files.some((name) => name.startsWith('.env')), 'Environment files forbidden');
if (files.includes('.temp')) {
  const names = await readdir(join(target, 'supabase', '.temp'));
  // Abort before reading any unknown link/credential file.
  requireSafeCliCache(names.map((name) => [name, '0.0.0']));
  requireSafeCliCache(await Promise.all(names.map(async (name) => [name, await readFile(join(target, 'supabase', '.temp', name), 'utf8')])));
}
const config = await readFile(join(target, 'supabase', 'config.toml'), 'utf8');
assert.equal(config, expectedConfig, 'Staging configuration drift forbidden');
const manifest = JSON.parse(await readFile(join(target, 'migration-manifest.json'), 'utf8'));
requireMigrationInventory(
  (await readdir(join(root, 'supabase', 'migrations'))).filter((name) => name.endsWith('.sql')),
  await readdir(join(target, 'supabase', 'migrations')),
  manifest.map((item) => item.name),
);
for (const item of manifest) {
  assert.match(item.name, /^\d+_[a-zA-Z0-9_]+\.sql$/);
  for (const path of [join(root, 'supabase', 'migrations', item.name), join(target, 'supabase', 'migrations', item.name)]) {
    assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), item.sha256, 'Migration drift');
  }
}
requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', context]))[0]);
env.DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine';
env.DOCKER_CONTEXT = context;
// Scoped official mirror: ECR's signed CDN download failed on this machine.
// Do not change daemon-wide registry settings or inherit arbitrary overrides.
env.SUPABASE_INTERNAL_IMAGE_REGISTRY = 'docker.io';
docker(['info', '--format', '{{.ServerVersion}}']);
const networkLines = docker(['network', 'ls', '--format', 'json']).trim();
const networks = networkLines ? networkLines.split('\n').map((line) => JSON.parse(line)) : [];
if (!networks.some((item) => item.Name === network)) {
  docker(['network', 'create', '--label', `buyntry.staging.owner=${projectId}`,
    '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', network]);
}
const inspected = JSON.parse(docker(['network', 'inspect', network]))[0];
assert.equal(inspected.Labels?.['buyntry.staging.owner'], projectId, 'Foreign network forbidden');
assert.equal(inspected.Options?.['com.docker.network.bridge.host_binding_ipv4'], '127.0.0.1');
assert.equal(docker(['ps', '-a', '--filter', `network=${network}`, '--format', '{{.ID}}']).trim(), '',
  'Existing network peers forbidden; inspect exact ownership before resuming');
// Prove the engine honors default loopback binding BEFORE a real service starts.
// The disposable probe runs only sleep: nothing listens on its published port.
const probeImage = JSON.parse(docker(['image', 'inspect', 'supabase/postgres:17.6.1.165']))[0].Id;
const probe = docker(['run', '--detach', '--pull=never', '--name', `buyntry-bind-probe-${randomUUID()}`,
  '--label', `buyntry.staging.owner=${projectId}`, '--network', network,
  '--publish', '0:5432', '--tmpfs', '/var/lib/postgresql/data:rw', '--entrypoint', '/bin/sh', probeImage, '-c', 'sleep 30']).trim();
try {
  const inspectedProbe = JSON.parse(docker(['inspect', probe]))[0];
  assert.equal(inspectedProbe.Config.Labels?.['buyntry.staging.owner'], projectId);
  assert.ok(inspectedProbe.Mounts.every((mount) => mount.Type !== 'volume'), 'No persistent probe volumes permitted');
  const bindings = Object.values(inspectedProbe.NetworkSettings.Ports ?? {}).flatMap((items) => items ?? []);
  assert.ok(bindings.length > 0 && bindings.every((item) => item.HostIp === '127.0.0.1'),
    'Engine ignores default loopback binding: cold CLI startup refused before real services; use the verified explicit-binding stack');
} finally {
  // Exact owned, no-volume, no-data sleep probe only. Never prune Docker state.
  const ownProbe = JSON.parse(docker(['inspect', probe]))[0];
  assert.equal(ownProbe.Config.Labels?.['buyntry.staging.owner'], projectId);
  docker(['stop', probe]); docker(['rm', probe]);
}
console.log('Local Docker and loopback-only owned network verified. Starting isolated Supabase; secret output suppressed.');
// Invoke the verified installed native binary directly. A timeout must terminate
// the CLI, not merely a PowerShell/npm wrapper that leaves an orphan startup.
const cli = 'D:\\npm-global\\node_modules\\supabase\\node_modules\\@supabase\\cli-windows-x64\\bin\\supabase.exe';
const args = ['start', '--network-id', network, '--exclude', 'realtime,edge-runtime,logflare,vector,supavisor'];
try {
  // First startup downloads multiple service images, including PostgreSQL.
  // Bound the actual native CLI while allowing a cold cache to initialize.
  run(cli, args, 15 * 60_000);
  const containers = docker(['ps', '--filter', `network=${network}`, '--format', '{{.ID}}']).trim().split('\n').filter(Boolean);
  assert.ok(containers.length > 0, 'No staging containers');
  for (const id of containers) {
    const item = JSON.parse(docker(['inspect', id]))[0];
    assert.ok(item.Name?.startsWith('/supabase_') && item.Name.endsWith(`_${projectId}`), 'Unexpected staging peer');
    for (const bindings of Object.values(item.NetworkSettings?.Ports ?? {})) {
      for (const binding of bindings ?? []) assert.equal(binding.HostIp, '127.0.0.1', 'Non-loopback binding forbidden');
    }
  }
} catch (error) {
  // Never delete volumes or stop unrelated Docker workloads. Stop only dedicated
  // Supabase names attached to our previously empty, labelled local network.
  const ids = docker(['ps', '--filter', `network=${network}`, '--format', '{{.ID}}']).trim().split('\n').filter(Boolean);
  for (const id of ids) {
    const item = JSON.parse(docker(['inspect', id]))[0];
    if (item.Name?.startsWith('/supabase_') && item.Name.endsWith(`_${projectId}`)) docker(['stop', id]);
  }
  throw error;
}
console.log('Isolated startup and loopback bindings verified. HTTP/Auth/Storage acceptance still required; outbound networking is NOT certified.');
