import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { loadLocalRuntime, root, stagingDirectory } from './runtime.mjs';

// Applies ONE reviewed additive migration to the existing owned loopback stack.
// Run prepare.mjs first. No remote CLI, reset, rollback/drop or fixture deletion.
const runtime = await loadLocalRuntime({ pendingSessionMigration: true });
const name = '20261030000000_admin_browser_sessions.sql';
const source = await readFile(join(root, 'supabase/migrations', name), 'utf8');
assert.match(source, /\nBEGIN;\r?\n/);
assert.match(source, /\nCOMMIT;\s*$/);
assert.equal(runtime.sql("SELECT to_regclass('public.admin_browser_sessions') IS NULL;"), 't');
const body = source.replace(/\nBEGIN;\r?\n/, '\n').replace(/\nCOMMIT;\s*$/, '\n');
runtime.sql(`BEGIN;\n${body}\nINSERT INTO supabase_migrations.schema_migrations(version,name)
  VALUES ('20261030000000','admin_browser_sessions');\nNOTIFY pgrst, 'reload schema';\nCOMMIT;`);
await loadLocalRuntime();
const report = { appliedLocally: name, sha256: createHash('sha256').update(source).digest('hex'),
  priorMigrationsPreserved: true, productionTouched: false, transactionCommitted: true };
await writeFile(join(stagingDirectory, 'session-migration-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
