import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { commandEnvironment, docker, stagingDirectory } from './runtime.mjs';
import { projectId } from './isolation.mjs';

/** CLI-injected runtime files are not volumes. Preserve them without logging
 * certificates/private keys or writing secret archives to the host filesystem. */
export function copyKongRuntimeFiles(originalId, replacementId) {
  for (const id of [originalId, replacementId]) assert.match(id, /^[a-f0-9]{64}$/);
  const [original, replacement] = JSON.parse(docker(['inspect', originalId, replacementId]));
  for (const item of [original, replacement]) {
    assert.equal(item.Config.Labels?.['com.supabase.cli.project'], projectId);
    assert.equal(item.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
    assert.equal(item.State.Running, false);
  }
  assert.equal(replacement.Name, `/supabase_kong_${projectId}`);
  assert.equal(replacement.Config.Labels?.['buyntry.loopback-replacement-of'], original.Id);
  for (const file of ['kong.yml', 'localhost.crt', 'localhost.key']) {
    const captured = spawnSync('docker', ['--context', 'desktop-linux', 'cp', `${originalId}:/home/kong/${file}`, '-'],
      { env: commandEnvironment(), timeout: 10_000, maxBuffer: 2_000_000 });
    assert.ok(!captured.error && captured.status === 0, 'Original local gateway runtime file unavailable');
    const restored = spawnSync('docker', ['--context', 'desktop-linux', 'cp', '-a', '-', `${replacementId}:/home/kong/`],
      { input: captured.stdout, env: commandEnvironment(), timeout: 10_000 });
    assert.ok(!restored.error && restored.status === 0, 'Gateway runtime-file copy failed');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const name = `supabase_kong_${projectId}`;
  const replacement = JSON.parse(docker(['inspect', name]))[0];
  const originalId = replacement.Config.Labels?.['buyntry.loopback-replacement-of'];
  assert.match(originalId ?? '', /^[a-f0-9]{64}$/);
  assert.equal(replacement.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
  docker(['stop', replacement.Id]);
  copyKongRuntimeFiles(originalId, replacement.Id);
  docker(['start', replacement.Id]);
  console.log('Copied exact owned local gateway runtime files in memory; no secret values logged. Gateway restarted; health must be verified.');
}
