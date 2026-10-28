import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { loadLocalRuntime, commandEnvironment } from './runtime.mjs';
import { runCases } from '../../tests/product-integrity/cases.mjs';
import { runCollectionCases } from '../../tests/product-integrity/collection-cases.mjs';

// No bootstrap/schema shim: use only the complete actual local migration replay.
const runtime = await loadLocalRuntime();
// Isolate the three historical fixed fixture slugs per run. Keep earlier rows
// intact instead of deleting them or resetting the successful staging database.
const runId = randomUUID();
const fixtureSql = (statement) => statement.replace(/'synthetic-(manual-2|manual|auto)'/g,
  (_, suffix) => `'synthetic-${suffix}-${runId}'`);
const sessions = new Set();
class Session {
  constructor(applicationName, role = 'service_role') {
    assert.ok(['service_role', 'postgres', 'anon', 'authenticated'].includes(role));
    assert.match(applicationName, /^[a-zA-Z0-9_-]+$/);
    this.child = spawn('docker', ['--context', 'desktop-linux', 'exec', '-i', runtime.container,
      'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
    { env: commandEnvironment(), stdio: ['pipe', 'pipe', 'pipe'] });
    this.errors = ''; this.lines = []; this.closed = false;
    this.child.stderr.on('data', (data) => { this.errors += data; });
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      if (this.pending && line === this.pending.marker) {
        const { resolve } = this.pending; this.pending = undefined;
        const output = this.lines.join('\n').trim(); this.lines = []; resolve(output);
      } else this.lines.push(line);
    });
    const fail = (error) => {
      this.closed = true;
      if (this.pending) { this.pending.reject(error); this.pending = undefined; }
    };
    this.child.on('error', fail);
    this.child.on('close', (code) => fail(new Error(this.errors.trim() || `Local psql exit ${code}`)));
    this.ready = this.query(`SET application_name='${applicationName}'; SET statement_timeout='15s';
      SET lock_timeout='10s'; SET ROLE ${role}; \\set VERBOSITY verbose\n`);
    sessions.add(this);
  }
  query(statement) {
    if (this.closed) return Promise.reject(new Error(this.errors || 'Local session closed'));
    assert.equal(this.pending, undefined);
    return new Promise((resolve, reject) => {
      const marker = `completed_${randomUUID().replaceAll('-', '')}`;
      this.pending = { marker, resolve, reject };
      this.child.stdin.write(`${fixtureSql(statement)}\n\\echo ${marker}\n`);
    });
  }
  close() { if (!this.closed) this.child.stdin.end('ROLLBACK;\n\\q\n'); sessions.delete(this); }
}
async function openSession(name, role) { const session = new Session(name, role); await session.ready; return session; }
async function sql(statement, role = 'service_role') {
  const session = await openSession(`local_${randomUUID()}`, role);
  try { return await session.query(statement); } finally { session.close(); }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Refuse collisions in this run's remapped fixture namespace and any leftover
// failure hook; never delete prior fixtures to make a rerun pass.
assert.equal(runtime.sql(fixtureSql("SELECT count(*) FROM collections WHERE slug IN ('synthetic-manual','synthetic-manual-2','synthetic-auto');")), '0', 'Run fixture collision');
assert.equal(runtime.sql("SELECT count(*) FROM pg_trigger WHERE tgname='synthetic_child_failure';"), '0', 'Foreign failure-injection trigger');
try {
  await runCases({ sql, openSession, sleep });
  await runCollectionCases({ sql, openSession, sleep });
  console.log('PASS: all 44 retained PostgreSQL scenarios on the complete migration schema (no shim; prior fixtures retained).');
} finally {
  for (const session of sessions) session.close();
  // The original disposable-container suite intentionally leaves this exact
  // injected trigger behind. Here retain fixtures but remove only its owned hook.
  runtime.sql('DROP TRIGGER IF EXISTS synthetic_child_failure ON public.product_images; DROP FUNCTION IF EXISTS public.synthetic_child_failure();');
}
