import assert from 'node:assert/strict';
import { readFile, writeFile, rename, lstat, realpath } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { loadBrowserPkiForRecovery } from './browser-pki.mjs';
import { stagingDirectory, commandEnvironment } from './runtime.mjs';
import { requireFreePort } from './local-app.mjs';

// Preserve interrupted session evidence, never kill a process or remove trust.
export function requireEndedSessionProcess(state, processInfo, native) {
  if (processInfo === null) return 'recorded process absent';
  assert.equal(processInfo.id, state.pid);
  assert.equal(native.owner, 'buyntry-isolated-acceptance/native-v1');
  assert.equal(native.runId, state.runId);
  const ended = Date.parse(native.finishedAt); const started = Date.parse(processInfo.startedAt);
  assert.ok(Number.isFinite(ended) && Number.isFinite(started) && started > ended,
    'Recorded process may still own this session');
  assert.ok(typeof processInfo.name === 'string' && processInfo.name.length > 0 &&
    !/^node(?:\.exe)?$/i.test(processInfo.name), 'Do not displace an existing Node process');
  return 'recorded PID reused by a later unrelated non-Node process; left untouched';
}
async function recover() {
assert.equal(process.argv.length, 2);
const pki = await loadBrowserPkiForRecovery();
const path = join(stagingDirectory, 'browser-https-session.json');
const state = JSON.parse(await readFile(path, 'utf8'));
assert.equal(state.owner, 'buyntry-isolated-acceptance/browser-https-v1');
assert.match(state.runId, /^[a-f0-9-]{36}$/);
assert.equal(state.caSha256, pki.manifest.sha256);
assert.ok(Number.isSafeInteger(state.pid) && state.pid > 0);
const processInfo = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
  `$ErrorActionPreference='Stop'; $p=Get-Process -Id ${state.pid} -ErrorAction SilentlyContinue; if ($p) { [pscustomobject]@{id=$p.Id;name=$p.ProcessName;startedAt=$p.StartTime.ToUniversalTime().ToString('o')} | ConvertTo-Json -Compress } else { 'null' }`],
  { env: commandEnvironment(), encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe'] }));
const native = processInfo === null ? undefined : JSON.parse(await readFile(join(stagingDirectory, 'browser-native-resume-results.json'), 'utf8'));
const processEvidence = requireEndedSessionProcess(state, processInfo, native);
for (const port of [3300, 3301, 33443, 33444, 55421]) await requireFreePort(port);
const archive = join(stagingDirectory, `browser-https-interrupted-${state.runId}.json`);
await writeFile(archive, JSON.stringify({ ...state, ready: false, interrupted: true,
  interruption: `All test ports closed; ${processEvidence}. Prior ready flag was stale.`,
  recoveredAt: new Date().toISOString() }, null, 2), { flag: 'wx' });
const input = join(pki.directory, 'browser-input.json');
try {
  assert.equal((await lstat(input)).isSymbolicLink(), false);
  assert.equal(dirname(await realpath(input)), resolve(pki.directory));
  const original = JSON.parse(await readFile(input, 'utf8'));
  assert.equal(original.email, `browser-https-${state.runId}@example.invalid`);
  const target = join(pki.directory, `browser-input-interrupted-${state.runId}.json`);
  assert.equal(dirname(resolve(target)), resolve(pki.directory));
  await assert.rejects(lstat(target), { code: 'ENOENT' });
  await rename(input, target); // Exact private file only; no recursive operation.
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const marker = join(pki.directory, 'browser-session.stop');
try {
  assert.equal((await lstat(marker)).isSymbolicLink(), false);
  assert.equal(dirname(await realpath(marker)), resolve(pki.directory));
  assert.equal(await readFile(marker, 'utf8'), state.runId);
  const target = join(pki.directory, `browser-session-stop-${state.runId}.txt`);
  await assert.rejects(lstat(target), { code: 'ENOENT' });
  await rename(marker, target);
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await writeFile(path, JSON.stringify({ ...state, ready: false, ended: false, interrupted: true,
  interruption: `Exact test ports free; ${processEvidence}. See preserved interrupted report.` }, null, 2));
console.log('Interrupted metadata/private input preserved; no process, certificate, identity or volume removed.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await recover();
