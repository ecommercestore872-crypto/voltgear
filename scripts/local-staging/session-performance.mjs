import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { commandEnvironment, loadLocalRuntime, root, stagingDirectory } from './runtime.mjs';
import { localAppEnvironment, requireFreePort, startLocalApp } from './local-app.mjs';

// Run only after the coordinator releases 3301. This owns one production admin
// process; it never builds, starts storefront, changes schema, or clears caches.
assert.deepEqual(process.argv.slice(2), [], 'No endpoint/environment overrides permitted');
const admin = 'http://127.0.0.1:3301';
const endpoint = '/api/admin/products?page=1&pageSize=1';
const warmupPairs = 5;
const rounds = 3;
const pairsPerRound = 20;
const rpcWarmup = 5;
const rpcSamples = 30;
const explainSamples = 5;
const output = join(stagingDirectory, 'session-performance-results.json');
const round = (value) => Math.round(value * 1000) / 1000;
function summary(values) {
  assert.ok(values.length > 0 && values.every(Number.isFinite));
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
  return { n: values.length, min: round(sorted[0]), p50: round(percentile(0.5)), p95: round(percentile(0.95)), max: round(sorted.at(-1)) };
}
function git(args) {
  const result = spawnSync('git', args, { cwd: root, env: commandEnvironment(), encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0, 'Local Git identity unavailable');
  return result.stdout.trim();
}
const cpuSnapshot = () => os.cpus().reduce((sum, cpu) => {
  sum.idle += cpu.times.idle;
  sum.total += Object.values(cpu.times).reduce((a, b) => a + b, 0);
  return sum;
}, { idle: 0, total: 0 });
function hostSnapshot() {
  return { freeMemoryMiB: round(os.freemem() / 1024 ** 2), cpu: cpuSnapshot() };
}
const report = {
  passed: false, startedAt: new Date().toISOString(), scope: 'Synthetic isolated loopback lab; no hosted traffic or real-user percentile claim.',
  environment: {
    runnerSha256: createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),
    head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']),
    node: process.version, next: JSON.parse(await readFile(join(root, 'node_modules/next/package.json'), 'utf8')).version,
    platform: os.platform(), release: os.release(), arch: os.arch(), logicalCpus: os.cpus().length,
    cpuModel: os.cpus()[0]?.model, totalMemoryMiB: round(os.totalmem() / 1024 ** 2),
    appMode: 'next start; existing production build; one owned admin process; Node heap cap 1024 MiB',
    viewport: 'N/A: Node fetch API benchmark, no browser rendering',
    throttling: 'No injected CPU or network throttling; loopback HTTP; concurrency 1; sequential trials',
    cache: 'No cache invalidation. Existing OS/Postgres buffers unknown. First endpoint pair reported separately; 5 warmup pairs; app session RPC explicitly no-store; protected middleware response private/no-store.',
    credentials: 'One fresh synthetic allowlisted user and one login; child environment from isolatedProcessEnvironment; credential values never persisted or logged.',
  },
  protocol: { endpoint, warmupPairs, rounds, pairsPerRound, rpcWarmup, rpcSamples, explainSamples,
    pairing: 'Same protected GET, same query and response digest; adjacent cookie/bearer pairs; alternating first actor on every pair and round.',
    percentiles: 'Nearest-rank sample percentiles in milliseconds; paired delta is cookie minus bearer, not difference between aggregate percentiles.',
    timing: 'performance.now around fetch through full response-body consumption; HTTP/RPC parsing and checks after timer; SQL timings from EXPLAIN, excluding Docker/psql startup.',
  },
  limitations: [
    'Machine bearer is a within-build control, not the old browser-auth implementation. No before/after application change is measured.',
    'HTTP delta includes two validator calls plus hashing/JSON/runtime work; no request-level distributed span identifies each component.',
    'Direct RPC uses the Node benchmark client, not middleware Edge runtime; its time cannot be subtracted as an exact decomposition.',
    'SQL ANALYZE executes the exact validator query body as its definer role in a rolled-back read-only transaction; function-call boundary, PostgREST transaction settings, observer overhead and warm tiny fixtures differ from hosted data/latency.',
    'Existing BUILD_ID is checked for immutability; this harness does not independently prove the production artifact was compiled from recorded Git HEAD.',
    'Host CPU busy fraction is an interval average, not attribution. Docker VM contention, external workload, production region, network and concurrency are unmeasured.',
    'No browser hydration, user interaction, Core Web Vitals, Lighthouse score, capacity/load test, or real-user p95 is measured.',
  ],
};
let app;
let runtime;
let cookie;
let userId;
let phase = 'isolation';
let hostBefore;
let failed;
const secret = randomUUID() + randomUUID();
const email = `session-perf-${randomUUID()}@example.invalid`;
const password = randomUUID() + randomUUID();
async function request(path, actor, { method = 'GET', body } = {}) {
  const started = performance.now();
  const response = await fetch(`${admin}${path}`, {
    method, redirect: 'manual', signal: AbortSignal.timeout(20_000), cache: 'no-store',
    headers: { Origin: admin, 'Content-Type': 'application/json',
      ...(actor === 'cookie' ? { Cookie: cookie } : {}), ...(actor === 'bearer' ? { Authorization: `Bearer ${secret}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  return { elapsedMs: performance.now() - started, status: response.status,
    digest: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, response, body: bytes };
}
let expectedDigest;
async function endpointTrial(actor) {
  const measured = await request(endpoint, actor);
  assert.equal(measured.status, 200, 'Measured protected endpoint must succeed');
  expectedDigest ??= measured.digest;
  assert.equal(measured.digest, expectedDigest, 'Compared responses changed; run invalid');
  assert.match(measured.response.headers.get('cache-control') ?? '', /private.*no-store/i);
  return { ms: round(measured.elapsedMs), bytes: measured.bytes, status: measured.status };
}
async function pair(index) {
  const actors = index % 2 === 0 ? ['cookie', 'bearer'] : ['bearer', 'cookie'];
  const item = { first: actors[0] };
  for (const actor of actors) item[actor] = await endpointTrial(actor);
  item.deltaMs = round(item.cookie.ms - item.bearer.ms);
  return item;
}
function pairSummary(pairs) {
  return { cookieMs: summary(pairs.map((p) => p.cookie.ms)), bearerMs: summary(pairs.map((p) => p.bearer.ms)),
    pairedDeltaMs: summary(pairs.map((p) => p.deltaMs)) };
}
try {
  runtime = await loadLocalRuntime(); // Full ownership, network, bindings, hashes, health and history guards.
  const manifest = JSON.parse(await readFile(join(stagingDirectory, 'migration-manifest.json'), 'utf8'));
  assert.equal(manifest.length, 64, 'This benchmark is scoped to the complete 64-migration schema');
  report.environment.migrations = manifest.length;
  report.environment.buildId = (await readFile(join(root, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim();
  report.environment.sessionMigrationSha256 = createHash('sha256').update(await readFile(join(root, 'supabase/migrations/20261030000000_admin_browser_sessions.sql'))).digest('hex');
  // Port check precedes synthetic account creation. No process is displaced.
  await requireFreePort(3301);
  phase = 'synthetic identity';
  const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(created.status, 200, 'Synthetic local user creation must succeed');
  userId = (await created.json()).id;
  assert.match(userId, /^[a-f0-9-]{36}$/);
  phase = 'owned production admin';
  app = await startLocalApp('admin', localAppEnvironment(runtime, { email, secret }), { productionBuild: true });
  phase = 'one login';
  const login = await request('/api/admin/login', undefined, { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200, 'Single synthetic login must succeed; do not retry rate-limited login');
  cookie = login.response.headers.get('set-cookie')?.split(';')[0];
  assert.match(cookie ?? '', /^vg_admin=v2\.[a-f0-9]{64}$/);
  const tokenHash = createHash('sha256').update(cookie.slice(cookie.indexOf('=') + 1)).digest('hex');
  report.environment.syntheticCardinality = JSON.parse(runtime.sql("SELECT json_build_object('users',(SELECT count(*) FROM auth.users),'authSessions',(SELECT count(*) FROM auth.sessions),'browserSessions',(SELECT count(*) FROM public.admin_browser_sessions),'products',(SELECT count(*) FROM public.products));"));
  phase = 'protected endpoint measurements';
  hostBefore = hostSnapshot();
  report.firstPair = await pair(0);
  for (let i = 0; i < warmupPairs; i++) await pair(i + 1);
  report.rounds = [];
  const allPairs = [];
  for (let r = 0; r < rounds; r++) {
    const pairs = [];
    for (let i = 0; i < pairsPerRound; i++) pairs.push(await pair(r * (pairsPerRound + 1) + i));
    allPairs.push(...pairs);
    report.rounds.push({ round: r + 1, ...pairSummary(pairs), pairs });
    console.log(`Completed session timing round ${r + 1}/${rounds} (${pairs.length} pairs; concurrency 1).`);
  }
  report.protectedEndpoint = { ...pairSummary(allPairs), responseBodySha256: expectedDigest };
  phase = 'direct validator RPC';
  const rpc = async () => {
    const started = performance.now();
    const response = await runtime.apiFetch('/rest/v1/rpc/admin_validate_browser_session_v2', {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token_hash: tokenHash }),
    });
    const body = await response.text();
    const elapsed = performance.now() - started;
    assert.equal(response.status, 200, 'Read-only direct validator RPC must succeed');
    assert.equal(JSON.parse(body)?.userId, userId, 'Direct validator must identify this synthetic user');
    return round(elapsed);
  };
  report.directRpcFirstMs = await rpc();
  for (let i = 0; i < rpcWarmup; i++) await rpc();
  const rpcValues = [];
  for (let i = 0; i < rpcSamples; i++) rpcValues.push(await rpc());
  report.directRpc = { milliseconds: summary(rpcValues), samplesMs: rpcValues };
  phase = 'read-only SQL plans';
  // Obtain the exact deployed function body rather than maintain a second query.
  const source = runtime.sql("SELECT prosrc FROM pg_proc WHERE oid='public.admin_validate_browser_session_v2(text)'::regprocedure;");
  assert.match(source, /^\s*SELECT jsonb_build_object/);
  assert.match(source, /b\.token_hash = p_token_hash/);
  const statement = source.replaceAll('p_token_hash', `'${tokenHash}'`).trim().replace(/;$/, '');
  const plans = [];
  for (let i = 0; i < explainSamples; i++) {
    const plan = runtime.sql(`BEGIN TRANSACTION READ ONLY; EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement}; ROLLBACK;`);
    // EXPLAIN predicates can contain the private synthetic hash; redact before storage.
    plans.push(JSON.parse(plan.replaceAll(tokenHash, '[SYNTHETIC_HASH_REDACTED]'))[0]);
  }
  report.sql = { planningMs: summary(plans.map((p) => p['Planning Time'])), executionMs: summary(plans.map((p) => p['Execution Time'])), plans };
  phase = 'measurement completion';
  const hostAfter = hostSnapshot();
  const total = hostAfter.cpu.total - hostBefore.cpu.total;
  report.environment.hostObservation = { before: hostBefore, after: hostAfter,
    cpuBusyPercentInterval: total > 0 ? round(100 * (1 - (hostAfter.cpu.idle - hostBefore.cpu.idle) / total)) : null };
  assert.equal((await readFile(join(root, 'apps/admin/.next/BUILD_ID'), 'utf8')).trim(), report.environment.buildId, 'Build changed during measurement');
  report.measurementsPassed = true;
} catch (error) {
  failed = true;
  // Assertion values can contain credentials. Emit numeric values and phase only.
  report.failure = { phase, type: error?.name ?? 'Error', code: /^[A-Z_0-9]+$/.test(error?.code ?? '') ? error.code : undefined,
    actual: typeof error?.actual === 'number' ? error.actual : undefined, expected: typeof error?.expected === 'number' ? error.expected : undefined };
  console.error(JSON.stringify({ failed: report.failure }));
} finally {
  report.cleanup = { retainedSyntheticFixtures: true, errors: [] };
  if (app && cookie) {
    try {
      report.syntheticLogoutStatus = (await request('/api/admin/logout', 'cookie', { method: 'POST' })).status;
      assert.equal(report.syntheticLogoutStatus, 200, 'Synthetic logout must succeed');
    } catch {
      report.syntheticLogoutStatus ??= 'unavailable';
      report.cleanup.errors.push('synthetic logout failed');
    }
  }
  if (app) {
    try {
      await app.close();
      await requireFreePort(3301);
      report.cleanup.adminPortReleased = true;
    } catch {
      report.cleanup.errors.push('owned admin shutdown or port-release verification failed');
    }
  }
  report.cleanup.passed = report.cleanup.errors.length === 0;
  report.passed = report.measurementsPassed === true && report.cleanup.passed;
  failed ||= !report.passed;
  report.finishedAt = new Date().toISOString();
  report.productionTouched = false;
  report.credentialsLogged = false;
  await writeFile(output, JSON.stringify(report, null, 2));
}
if (failed) process.exitCode = 1;
else console.log(JSON.stringify({ passed: true, protectedEndpoint: report.protectedEndpoint, directRpc: report.directRpc.milliseconds,
  sqlExecutionMs: report.sql.executionMs, report: 'tmp/isolated-staging/session-performance-results.json' }));
