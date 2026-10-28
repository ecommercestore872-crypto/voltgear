import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export const migrationFiles = Object.freeze([
  ['20261028000000_product_integrity_v2.sql', '3ed0b3a4cb7db6c5accef962a3696ca46a035dcaf528c699761f884d000e8577'],
  ['20261029000000_collection_integrity.sql', 'c54b95deef2fa84e4b73a96e6243b7a638f8bc5edd4921e742abce7f2406725a'],
  ['20261030000000_admin_browser_sessions.sql', '51b5b287eca1b5112611cf03d0d9e3a7cdaa91d27d505a8e8519c60173288748'],
]);
export async function readReleaseMigrations(directory) {
  return Promise.all(migrationFiles.map(async ([name, hash]) => {
    const bytes = await readFile(new URL(name, directory));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `Reviewed migration changed: ${name}`);
    return { name, sha256: hash, source: bytes.toString('utf8') };
  }));
}

// The production runner is NOT implicitly Supabase CLI db push. This explicit
// psql batch is a proposed runner, executable only through the guarded local lab.
// Preserve source bytes: normalize ONLY the known, hash-verified outer wrapper
// in30 so all three dependent files plus history commit as one transaction.
export function renderReleaseMigrationPlan(files, { lockMs = 1000, statementMs = 30000, failAt } = {}) {
  assert.deepEqual(files.map(({ name, sha256 }) => [name, sha256]), migrationFiles);
  assert.ok(Number.isInteger(lockMs) && lockMs >= 100 && lockMs <= 10000);
  assert.ok(Number.isInteger(statementMs) && statementMs >= lockMs && statementMs <= 120000);
  const failurePoints = ['before28', 'mid28', 'after28', 'mid29', 'after29', 'mid30', 'after30', 'afterHistory'];
  assert.ok(failAt === undefined || failurePoints.includes(failAt));
  const fault = (point) => point === failAt ? "DO $$ BEGIN RAISE EXCEPTION 'LOCAL_RELEASE_INJECTED_FAILURE' USING ERRCODE='P0001'; END $$;\n" : '';
  let text = `\\set ON_ERROR_STOP on\nBEGIN;\nSET LOCAL lock_timeout='${lockMs}ms';\nSET LOCAL statement_timeout='${statementMs}ms';\nSELECT pg_advisory_xact_lock(19493, 2830);\n`;
  text += `DO $$ BEGIN IF (SELECT count(*) FROM supabase_migrations.schema_migrations) <> 61
    OR (SELECT max(version) FROM supabase_migrations.schema_migrations) IS DISTINCT FROM '20261027000000'
    OR to_regclass('public.admin_browser_sessions') IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected release migration baseline' USING ERRCODE='55000'; END IF; END $$;\n`;
  text += 'LOCK TABLE public.products, public.collections, public.collection_products, public.orders, public.product_reviews IN SHARE ROW EXCLUSIVE MODE;\n';
  text += fault('before28');
  for (const [index, file] of files.entries()) {
    assert.equal(createHash('sha256').update(file.source).digest('hex'), file.sha256, 'Source/hash mismatch');
    let body = file.source;
    if (index === 2) {
      assert.equal((body.match(/^BEGIN;\r?$/gm) ?? []).length, 1);
      assert.equal((body.match(/^COMMIT;\r?$/gm) ?? []).length, 1);
      assert.match(body, /\nCOMMIT;\s*$/);
      body = body.replace(/^BEGIN;\r?\n/m, '').replace(/^COMMIT;\s*$/m, '');
    } else assert.equal((body.match(/^(?:BEGIN|COMMIT|ROLLBACK);\r?$/gm) ?? []).length, 0);
    const checkpoint = [
      'CREATE OR REPLACE FUNCTION public.admin_write_product_v2(',
      'CREATE FUNCTION public.collection_child_revision_v1()',
      'CREATE FUNCTION public.admin_validate_browser_session_v2(',
    ][index];
    assert.equal(body.split(checkpoint).length, 2, 'Actual-file injection boundary changed');
    if (failAt === `mid${28 + index}`) body = body.replace(checkpoint, fault(failAt) + checkpoint);
    text += `\n-- SOURCE ${file.name} SHA256 ${file.sha256}\n${body}\n${fault(`after${28 + index}`)}`;
  }
  for (const { name } of files) {
    const version = name.split('_')[0], title = name.slice(version.length + 1, -4);
    assert.match(title, /^[a-z0-9_]+$/);
    text += `INSERT INTO supabase_migrations.schema_migrations(version,name) VALUES ('${version}','${title}');\n`;
  }
  return text + fault('afterHistory') + "NOTIFY pgrst, 'reload schema';\nCOMMIT;\n";
}
