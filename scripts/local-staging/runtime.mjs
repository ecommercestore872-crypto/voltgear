import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { config } from './config.mjs';
import { isolatedProcessEnvironment, projectId, requireLocalEndpoint, requireOwnedLocalDocker, requireMigrationInventory } from './isolation.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const stagingDirectory = join(root, 'tmp', 'isolated-staging');
export const nativeCli = 'D:\\npm-global\\node_modules\\supabase\\node_modules\\@supabase\\cli-windows-x64\\bin\\supabase.exe';
const engine = 'npipe:////./pipe/dockerDesktopLinuxEngine';
export const commandEnvironment = () => ({ ...isolatedProcessEnvironment(), DOCKER_HOST: engine, DOCKER_CONTEXT: 'desktop-linux' });

export function docker(args, input) {
  const result = spawnSync('docker', ['--context', 'desktop-linux', ...args], {
    env: commandEnvironment(), input, encoding: 'utf8', timeout: 30_000,
  });
  // SQL diagnostics are synthetic only; never print raw Auth/status/inspect data.
  assert.ok(!result.error && result.status === 0, `Local Docker command failed (${result.error?.code ?? result.status})`);
  return result.stdout.trim();
}

export async function loadLocalRuntime({ pendingSessionMigration = false } = {}) {
  assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
  assert.equal(await readFile(join(stagingDirectory, 'supabase/config.toml'), 'utf8'), config, 'Local config drift');
  const manifest = JSON.parse(await readFile(join(stagingDirectory, 'migration-manifest.json'), 'utf8'));
  requireMigrationInventory((await readdir(join(root, 'supabase/migrations'))).filter((name) => name.endsWith('.sql')),
    await readdir(join(stagingDirectory, 'supabase/migrations')), manifest.map((item) => item.name));
  for (const item of manifest) {
    for (const path of [join(root, 'supabase/migrations', item.name), join(stagingDirectory, 'supabase/migrations', item.name)]) {
      assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), item.sha256, 'Migration drift');
    }
  }
  requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0]);
  const container = `supabase_db_${projectId}`;
  const inspected = JSON.parse(docker(['inspect', container]))[0];
  assert.equal(inspected.Name, `/${container}`);
  assert.equal(inspected.State?.Running, true);
  const network = `${projectId}-loopback`;
  assert.ok(inspected.NetworkSettings?.Networks?.[network], 'Dedicated network required');
  const networkDetails = JSON.parse(docker(['network', 'inspect', network]))[0];
  assert.equal(networkDetails.Labels?.['buyntry.staging.owner'], projectId);
  assert.equal(networkDetails.Options?.['com.docker.network.bridge.host_binding_ipv4'], '127.0.0.1');
  for (const service of ['db', 'kong', 'auth', 'rest', 'storage', 'inbucket', 'pg_meta', 'studio']) {
    const name = `supabase_${service}_${projectId}`;
    const peer = JSON.parse(docker(['inspect', name]))[0];
    assert.equal(peer.Name, `/${name}`);
    assert.equal(peer.Config.Labels?.['com.supabase.cli.project'], projectId);
    assert.equal(peer.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
    assert.equal(peer.State.Running, true, 'Every local service must be running');
    assert.deepEqual(Object.keys(peer.NetworkSettings.Networks), [network]);
    for (const bindings of Object.values(peer.NetworkSettings.Ports ?? {})) {
      for (const item of bindings ?? []) assert.equal(item.HostIp, '127.0.0.1');
    }
  }
  for (const bindings of Object.values(inspected.NetworkSettings.Ports ?? {})) {
    for (const item of bindings ?? []) assert.equal(item.HostIp, '127.0.0.1');
  }
  const status = spawnSync(nativeCli, ['status', '--output', 'json'], {
    cwd: stagingDirectory, env: commandEnvironment(), encoding: 'utf8', timeout: 60_000,
  });
  assert.ok(!status.error && status.status === 0, 'Local Supabase status unavailable');
  const values = JSON.parse(status.stdout);
  const api = requireLocalEndpoint(values.API_URL, 55321);
  assert.ok(values.SERVICE_ROLE_KEY && values.ANON_KEY, 'Local keys required (not logged)');
  let db;
  try { db = new URL(values.DB_URL); }
  catch { throw new Error('Invalid local database endpoint; credential-bearing input suppressed'); }
  assert.equal(db.protocol, 'postgresql:');
  assert.equal(db.hostname, '127.0.0.1');
  assert.equal(db.port, '55322');
  const sql = (statement) => docker(['exec', '-i', container, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], statement);
  const versions = JSON.parse(sql('SELECT coalesce(json_agg(version ORDER BY version),\'[]\'::json) FROM supabase_migrations.schema_migrations;'));
  const expected = manifest.map((item) => item.name.split('_')[0]).sort();
  if (pendingSessionMigration) {
    // Only the additive session migration may be pending during its local apply.
    // Every other guard (ownership, history, hashes, bindings, health) still runs.
    assert.equal(expected.at(-1), '20261030000000');
    assert.deepEqual(versions, expected.slice(0, -1), 'Existing full migration history required');
  } else assert.deepEqual(versions, expected, 'Full migration replay required');
  // A deployment's local URL alone is insufficient: verify project, Docker engine,
  // owned database/network, complete history and service health before any writes.
  async function apiFetch(path, options = {}, role = 'service') {
    assert.ok(path.startsWith('/') && !path.startsWith('//') && !path.includes('\\'));
    const target = new URL(path, api);
    assert.equal(target.origin, api);
    const key = role === 'anon' ? values.ANON_KEY : values.SERVICE_ROLE_KEY;
    return fetch(target, { ...options, redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, ...options.headers } });
  }
  const health = await apiFetch('/auth/v1/health');
  assert.equal(health.status, 200);
  const storage = await apiFetch('/storage/v1/bucket');
  assert.equal(storage.status, 200);
  return { api, sql, apiFetch, values, container };
}
