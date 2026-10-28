import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readReleaseMigrations, renderReleaseMigrationPlan } from './release-migration-plan.mjs';
const files = await readReleaseMigrations(new URL('../../supabase/migrations/', import.meta.url));
test('reviewed actual28/29/30 become one transaction with history inside commit', () => {
  const sql = renderReleaseMigrationPlan(files);
  assert.equal((sql.match(/^BEGIN;/gm) ?? []).length, 1);
  assert.equal((sql.match(/^COMMIT;/gm) ?? []).length, 1);
  for (const file of files) assert.ok(sql.includes(`SHA256 ${file.sha256}`));
  assert.ok(sql.indexOf('admin_revoke_browser_sessions_on_identity_change_v2') < sql.indexOf('INSERT INTO supabase_migrations'));
  assert.ok(sql.indexOf('INSERT INTO supabase_migrations') < sql.indexOf('NOTIFY pgrst'));
  assert.ok(sql.endsWith('COMMIT;\n'));
});
test('changed bytes, wrong order, invalid budgets and unknown injection rejected', () => {
  assert.throws(() => renderReleaseMigrationPlan([...files].reverse()));
  assert.throws(() => renderReleaseMigrationPlan([{ ...files[0], source: files[0].source + ' ' }, ...files.slice(1)]));
  assert.throws(() => renderReleaseMigrationPlan(files, { lockMs: 0 }));
  assert.throws(() => renderReleaseMigrationPlan(files, { statementMs: 1000000 }));
  assert.throws(() => renderReleaseMigrationPlan(files, { failAt: 'COMMIT' }));
});
test('controlled failures cover actual file boundaries and transactional history', () => {
  for (const failAt of ['before28', 'mid28', 'after28', 'mid29', 'after29', 'mid30', 'after30', 'afterHistory']) {
    const sql = renderReleaseMigrationPlan(files, { failAt });
    assert.equal((sql.match(/LOCAL_RELEASE_INJECTED_FAILURE/g) ?? []).length, 1);
    assert.ok(sql.indexOf('LOCAL_RELEASE_INJECTED_FAILURE') < sql.lastIndexOf('COMMIT;'));
  }
});
