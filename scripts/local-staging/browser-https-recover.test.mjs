import test from 'node:test';
import assert from 'node:assert/strict';
import { requireEndedSessionProcess } from './browser-https-recover.mjs';
const state = { pid: 1234, runId: 'test-owned-run' };
const native = { owner: 'buyntry-isolated-acceptance/native-v1', runId: state.runId, finishedAt: '2026-10-27T07:04:47Z' };
const later = { id: state.pid, name: 'wsl', startedAt: '2026-10-27T13:24:16Z' };
test('absent process and strictly later unrelated non-Node PID are recoverable', () => {
  assert.match(requireEndedSessionProcess(state, null), /absent/);
  assert.match(requireEndedSessionProcess(state, later, native), /reused/);
});
test('recovery refuses a possibly active process or mismatched session evidence', () => {
  for (const change of [{ name: 'node' }, { name: 'NODE.EXE' }, { name: '' },
    { startedAt: native.finishedAt }, { startedAt: '2026-10-27T07:00:00Z' },
    { startedAt: 'invalid' }, { id: 99 }])
    assert.throws(() => requireEndedSessionProcess(state, { ...later, ...change }, native));
  for (const change of [{ owner: 'foreign' }, { runId: 'foreign' }, { finishedAt: 'invalid' }])
    assert.throws(() => requireEndedSessionProcess(state, later, { ...native, ...change }));
});
