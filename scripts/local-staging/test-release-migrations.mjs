import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { join } from 'node:path';
import { loadLocalRuntime, root, stagingDirectory, docker, commandEnvironment } from './runtime.mjs';
import { readReleaseMigrations, renderReleaseMigrationPlan } from './release-migration-plan.mjs';

// Explicit local-only runner. There is no connection URL, linked project, remote
// flag or production execution mode. Existing lab data is read schema-only.
assert.equal(process.argv.length, 2);
const runId = randomUUID(), tag = runId.replaceAll('-', '').slice(0, 16);
const directory = join(stagingDirectory, `actual-migrations-${runId}`); await mkdir(directory);
const report = { runId, startedAt: new Date().toISOString(), runner: 'psql -X ON_ERROR_STOP; explicit single transaction for28/29/30 and history',
  status: 'not-executed', results: [], ownedDatabases: [], productionTouched: false };
const save = () => writeFile(join(directory, 'results.json'), JSON.stringify(report, null, 2));
await save();
let runtime, phase = 'verify isolated lab';
const owned = new Set();
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
function psql(database, sql, { expectedFailure = false, cloneAdministrator = false } = {}) {
  assert.ok(owned.has(database), 'Only newly owned test databases accept SQL');
  const result = spawnSync('docker', ['--context', 'desktop-linux', 'exec', '-i', runtime.container,
    'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose', '-U', cloneAdministrator ? 'supabase_admin' : 'postgres', '-d', database],
  { input: sql, encoding: 'utf8', env: commandEnvironment(), timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  if (expectedFailure) {
    assert.ok(!result.error && result.status !== 0, 'Expected actual SQL failure');
    return result;
  }
  if (result.error || result.status !== 0) {
    const code = result.stderr?.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1];
    const detail = result.stderr?.split(/\r?\n/).find((line) => /^ERROR:/.test(line))?.slice(0, 180);
    throw new Error(`Owned database SQL failed (${code ?? result.error?.code ?? result.status}); phase ${phase}; ${detail ?? ''}`);
  }
  return result.stdout.trim();
}
function createDatabase(suffix, template = 'template0') {
  const name = `release_${tag}_${suffix}`; assert.match(name, /^release_[a-f0-9]{16}_[a-z0-9]+$/);
  assert.ok(template === 'template0' || owned.has(template));
  assert.equal(runtime.sql(`SELECT count(*) FROM pg_database WHERE datname=${quote(name)};`), '0');
  runtime.sql(`CREATE DATABASE ${name} TEMPLATE ${template};`);
  owned.add(name); report.ownedDatabases.push(name);
  runtime.sql(`COMMENT ON DATABASE ${name} IS ${quote(`buyntry-local-release:${runId}`)};`);
  return name;
}
const digest = (database) => {
  const schema = docker(['exec', runtime.container, 'pg_dump', '-U', 'postgres', '-d', database,
    '--schema-only', '--no-owner']).replace(/^\\(?:un)?restrict .+$/gm, '');
  const data = psql(database, "SELECT json_build_object('products',(SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id),'[]') FROM products p), 'history',(SELECT jsonb_agg(to_jsonb(h) ORDER BY version) FROM supabase_migrations.schema_migrations h));");
  return createHash('sha256').update(schema).update(data).digest('hex');
};
try {
  runtime = await loadLocalRuntime();
  report.postgresVersion = runtime.sql('SHOW server_version;'); assert.match(report.postgresVersion, /^17\./);
  report.psqlVersion = docker(['exec', runtime.container, 'psql', '--version']);
  const sources = await readReleaseMigrations(new URL('../../supabase/migrations/', import.meta.url));
  report.migrations = sources.map(({ name, sha256 }) => ({ name, sha256 }));
  phase = 'create independent full-schema baseline';
  const baseline = createDatabase('base');
  // Preserve provider ownership and grants in the empty clone. Dropping owners
  // would incorrectly make Auth/history objects belong to the clone administrator.
  const schema = docker(['exec', runtime.container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--schema-only']);
  await writeFile(join(directory, 'synthetic-lab-schema-only.sql'), schema);
  // Only schema clone/bootstrap may use the existing local provider superuser;
  // all reviewed application migrations and failure scenarios run as postgres.
  psql(baseline, schema, { cloneAdministrator: true });
  // Only our brand-new empty database is reset, never the preserved source lab.
  // Retain actual provider Auth/Storage columns; remove app DDL and Storage
  // policies so the actual historical migration files can be replayed once.
  psql(baseline, `DROP SCHEMA public CASCADE; CREATE SCHEMA public;
    DROP SCHEMA supabase_migrations CASCADE; CREATE SCHEMA supabase_migrations;
    CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
    GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
    DO $$ DECLARE r record; BEGIN FOR r IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='storage'
      LOOP EXECUTE format('DROP POLICY %I ON %I.%I',r.policyname,r.schemaname,r.tablename); END LOOP; END $$;`);
  const names = (await readdir(join(root, 'supabase/migrations'))).filter((name) => /^\d+_.+\.sql$/.test(name) && name < sources[0].name).sort();
  assert.equal(names.length, 61);
  for (const name of names) {
    phase = `baseline ${name}`;
    const body = await readFile(join(root, 'supabase/migrations', name), 'utf8');
    assert.doesNotMatch(body, /\b(?:CREATE|ALTER|DROP)\s+(?:ROLE|DATABASE)|ALTER\s+SYSTEM/i);
    psql(baseline, body);
    psql(baseline, `INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES (${quote(name.split('_')[0])},${quote(name.slice(15, -4))});`);
  }
  psql(baseline, "INSERT INTO products(name,slug,category,price,quantity,status) VALUES ('Synthetic migration sentinel','release-migration-sentinel','synthetic',100,7,'published');");
  report.baselineMigrations = names.length;
  for (const failAt of ['before28', 'mid28', 'after28', 'mid29', 'after29', 'mid30', 'after30', 'afterHistory']) {
    phase = `failure ${failAt}`;
    const db = createDatabase(failAt.toLowerCase(), baseline), before = digest(db);
    const result = psql(db, renderReleaseMigrationPlan(sources, { failAt }), { expectedFailure: true });
    assert.match(result.stderr, /LOCAL_RELEASE_INJECTED_FAILURE/);
    assert.equal(digest(db), before, 'Actual schema/grants/data/history must roll back');
    assert.equal(psql(db, "SELECT to_regclass('public.admin_browser_sessions') IS NULL;"), 't');
    assert.equal(psql(db, "SELECT count(*) FROM pg_trigger WHERE tgname='admin_revoke_browser_sessions_on_identity_change_v2';"), '0');
    report.results.push({ name: phase, passed: true }); await save();
  }
  phase = 'bounded lock failure and retry';
  const locked = createDatabase('lock', baseline), before = digest(locked);
  const blocker = spawn('docker', ['--context', 'desktop-linux', 'exec', '-i', runtime.container,
    'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', locked],
  { env: commandEnvironment(), stdio: ['pipe', 'pipe', 'pipe'] });
  let lockOutput = '';
  blocker.stdout.on('data', (part) => { lockOutput += part; });
  blocker.stderr.resume();
  try {
    blocker.stdin.write("BEGIN; LOCK TABLE products IN ACCESS EXCLUSIVE MODE; SELECT 'OWNED_LOCK_READY';\n");
    for (let i = 0; i < 100 && !lockOutput.includes('OWNED_LOCK_READY'); i++) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(lockOutput.includes('OWNED_LOCK_READY'));
    const start = performance.now();
    const failure = psql(locked, renderReleaseMigrationPlan(sources, { lockMs: 500 }), { expectedFailure: true });
    assert.match(failure.stderr, /55P03/); assert.ok(performance.now() - start < 10000);
  } finally { blocker.stdin.end('ROLLBACK;\n\\q\n'); await new Promise((resolve) => blocker.once('exit', resolve)); }
  assert.equal(digest(locked), before);
  psql(locked, renderReleaseMigrationPlan(sources));
  assert.equal(psql(locked, 'SELECT count(*) FROM supabase_migrations.schema_migrations;'), '64');
  assert.equal(psql(locked, "SELECT quantity FROM products WHERE slug='release-migration-sentinel';"), '7');
  report.results.push({ name: phase, passed: true });
  phase = 'reapply refuses unexpected baseline without altering schema or history';
  const applied = digest(locked);
  const retry = psql(locked, renderReleaseMigrationPlan(sources), { expectedFailure: true });
  assert.match(retry.stderr, /55000/); assert.equal(digest(locked), applied);
  report.results.push({ name: phase, passed: true });
  phase = 'Auth trigger grants and synthetic session revocation';
  const user = randomUUID(), session = randomUUID(), token = 'a'.repeat(64);
  const auth = psql(locked, `INSERT INTO auth.users(id,email,encrypted_password,email_confirmed_at,updated_at,role)
    VALUES ('${user}','release-${tag}@example.invalid','synthetic-only',now(),now(),'authenticated') RETURNING updated_at;`);
  psql(locked, `INSERT INTO auth.sessions(id,user_id,not_after) VALUES ('${session}','${user}',now()+interval '1 hour');
    SET ROLE service_role; SELECT public.admin_create_browser_session_v2('${token}','${user}','${session}',${quote(auth)});`);
  assert.equal(psql(locked, `SET ROLE service_role; SELECT public.admin_validate_browser_session_v2('${token}') IS NOT NULL;`), 't');
  psql(locked, `UPDATE auth.users SET encrypted_password='synthetic-changed' WHERE id='${user}'; UPDATE auth.users SET encrypted_password='synthetic-only' WHERE id='${user}';`);
  assert.equal(psql(locked, `SET ROLE service_role; SELECT public.admin_validate_browser_session_v2('${token}') IS NULL;`), 't');
  assert.equal(psql(locked, "SELECT has_function_privilege('anon','public.admin_validate_browser_session_v2(text)','EXECUTE');"), 'f');
  assert.equal(psql(locked, "SELECT has_table_privilege('service_role','public.admin_browser_sessions','SELECT');"), 'f');
  report.results.push({ name: phase, passed: true }); report.status = 'passed';
} catch (error) {
  report.status = 'blocked-or-failed'; report.failure = { phase, message: error.message.slice(0, 400) };
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.retention = 'All newly owned databases and synthetic fixtures retained; existing lab source read schema-only.';
  await save(); console.log(JSON.stringify({ report: join(directory, 'results.json'), status: report.status,
    checks: report.results.length, failure: report.failure, ownedDatabases: report.ownedDatabases }));
}
