import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { runCases } from '../tests/product-integrity/cases.mjs';

const owner = randomUUID();
const label = 'voltgear.product-integrity-owner';
const name = `voltgear-product-integrity-${owner}`;
const image = 'postgres:17-alpine';
const environment = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete environment[key];
let context;
let container;
const sessions = new Set();

function docker(args, input) {
  const fullArgs = context ? ['--context', context, ...args] : args;
  const result = spawnSync('docker', fullArgs, { input, encoding: 'utf8', env: environment, timeout: 30_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `Docker command failed (${result.status})`);
  return result.stdout.trim();
}

class Session {
  constructor(applicationName, role = 'service_role') {
    this.child = spawn('docker', ['--context', context, 'exec', '-i', container,
      'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'product_integrity'],
    { env: environment, stdio: ['pipe', 'pipe', 'pipe'] });
    this.errors = '';
    this.lines = [];
    this.pending = undefined;
    this.closed = false;
    this.child.stderr.on('data', (data) => { this.errors += data; });
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      if (this.pending && line === this.pending.marker) {
        const { resolve } = this.pending;
        this.pending = undefined;
        const output = this.lines.join('\n').trim();
        this.lines = [];
        resolve(output);
      } else this.lines.push(line);
    });
    const fail = (error) => {
      this.closed = true;
      if (this.pending) {
        this.pending.reject(error);
        this.pending = undefined;
      }
    };
    this.child.on('error', fail);
    this.child.on('close', (code) => fail(new Error(this.errors.trim() || `psql closed (${code})`)));
    // Verbose errors include SQLSTATE for assertions against the real database.
    this.ready = this.query(`SET application_name = '${applicationName}'; SET statement_timeout='15s';
      SET lock_timeout='10s'; SET ROLE ${role}; \\set VERBOSITY verbose\n`);
    sessions.add(this);
  }
  query(sql) {
    if (this.closed) return Promise.reject(new Error(this.errors || 'Session is closed'));
    assert.equal(this.pending, undefined, 'One in-flight request per independent session');
    return new Promise((resolve, reject) => {
      const marker = `completed_${randomUUID().replaceAll('-', '')}`;
      this.pending = { marker, resolve, reject };
      this.child.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }
  close() {
    if (!this.closed) this.child.stdin.end('ROLLBACK;\n\\q\n');
    sessions.delete(this);
  }
}

async function openSession(applicationName, role) {
  const session = new Session(applicationName, role);
  await session.ready;
  return session;
}
async function sql(command, role = 'service_role') {
  const session = await openSession(`integrity_${randomUUID()}`, role);
  try { return await session.query(command); } finally { session.close(); }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  const migrationNames = (await readdir(new URL('../supabase/migrations/', import.meta.url)))
    .filter((path) => path.endsWith('.sql'));
  const migrationVersions = migrationNames.map((path) => path.split('_')[0]);
  assert.equal(new Set(migrationVersions).size, migrationVersions.length, 'Migration history versions must be unique');
  console.log('PASS: migration history version uniqueness');
  context = docker(['context', 'show']);
  const endpoint = JSON.parse(docker(['context', 'inspect', context]))[0]?.Endpoints?.docker?.Host;
  assert.match(endpoint ?? '', /^(npipe:\/\/|unix:\/\/)/, 'Only a local Docker socket is permitted');
  docker(['info', '--format', '{{.ServerVersion}}']);
  docker(['image', 'inspect', image]);
  container = docker(['run', '--detach', '--pull=never', '--name', name, '--label', `${label}=${owner}`,
    '--network', 'none', '--tmpfs', '/var/lib/postgresql/data:rw',
    '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', 'POSTGRES_DB=product_integrity', image]);
  assert.match(container, /^[a-f0-9]{64}$/);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'product_integrity']); ready = true; break; }
    catch { await sleep(500); }
  }
  assert.ok(ready, 'Disposable PostgreSQL became ready');

  const migrations = [
    'tests/product-integrity/bootstrap.sql',
    'supabase/migrations/20260826140000_init_store.sql',
    'tests/product-integrity/schema.sql',
    'supabase/migrations/20260901040000_collections.sql',
    'supabase/migrations/20261018000000_atomic_product_publish.sql',
    'supabase/migrations/20261019000000_atomic_promo_redemption.sql',
    'supabase/migrations/20261022000000_demo_sandbox_isolation.sql',
    'supabase/migrations/20261023000000_atomic_review_moderation.sql',
    'supabase/migrations/20261028000000_product_integrity_v2.sql',
  ];
  for (const path of migrations) {
    docker(['exec', '-i', container, 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'product_integrity'],
      await readFile(new URL(path, new URL('../', import.meta.url)), 'utf8'));
  }
  await sql('GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;', 'postgres');
  await runCases({ sql, openSession, sleep });
  console.log('PASS: product integrity PostgreSQL integration suite');
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  for (const session of sessions) session.close();
  if (container) {
    const metadata = JSON.parse(docker(['inspect', container]))[0];
    assert.equal(metadata.Id, container);
    assert.equal(metadata.Name, `/${name}`);
    assert.equal(metadata.Config.Labels[label], owner, 'Only the exact owned disposable container may be removed');
    docker(['rm', '--force', container]);
  }
}
