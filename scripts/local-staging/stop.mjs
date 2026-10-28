import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { docker, stagingDirectory } from './runtime.mjs';
import { projectId, requireOwnedLocalDocker } from './isolation.mjs';
assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0]);
const names = ['db', 'kong', 'auth', 'rest', 'storage', 'inbucket', 'pg_meta', 'studio'].map((service) => `supabase_${service}_${projectId}`);
const containers = JSON.parse(docker(['inspect', ...names]));
for (const item of containers) {
  assert.ok(names.includes(item.Name.slice(1)));
  assert.equal(item.Config.Labels?.['com.supabase.cli.project'], projectId);
  assert.equal(item.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
  assert.deepEqual(Object.keys(item.NetworkSettings.Networks), [`${projectId}-loopback`]);
}
let stopped = 0;
for (const item of containers) if (item.State.Running) { docker(['stop', item.Id]); stopped++; }
console.log(`Stopped ${stopped} exact owned acceptance containers; all containers, fixtures and volumes retained. Docker Desktop and unrelated workloads unchanged.`);
