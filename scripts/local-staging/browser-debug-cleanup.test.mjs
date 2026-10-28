import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupBrowserDebug } from './browser-debug-cleanup.mjs';
const names = ['saveInitialEvidence', 'closeBrowser', 'closeProxy', 'closeApp', 'requirePortsFree', 'restoreGenerated', 'saveFinalEvidence'];
function fixture(failures) {
  const calls = [];
  const steps = Object.fromEntries(names.map((name) => [name, async () => { calls.push(name); if (failures.includes(name)) throw new Error('injected failure'); }]));
  return { calls, steps };
}
test('owned resources close even when evidence or other shutdown steps fail', async () => {
  const { calls, steps } = fixture(['saveInitialEvidence', 'closeBrowser', 'closeProxy']);
  assert.deepEqual(await cleanupBrowserDebug(steps), ['saveInitialEvidence', 'closeBrowser', 'closeProxy']);
  assert.deepEqual(calls, names);
});
test('occupied or unverifiable ports prevent generated source restoration', async () => {
  const { calls, steps } = fixture(['closeApp', 'requirePortsFree']);
  assert.deepEqual(await cleanupBrowserDebug(steps), ['closeApp', 'requirePortsFree']);
  assert.equal(calls.includes('restoreGenerated'), false);
  assert.equal(calls.at(-1), 'saveFinalEvidence');
});
test('restoration failures preserve final evidence and a fully clean path has no errors', async () => {
  const failed = fixture(['restoreGenerated']);
  assert.deepEqual(await cleanupBrowserDebug(failed.steps), ['restoreGenerated']);
  assert.equal(failed.calls.at(-1), 'saveFinalEvidence');
  const clean = fixture([]); assert.deepEqual(await cleanupBrowserDebug(clean.steps), []);
  assert.deepEqual(clean.calls, names);
});
