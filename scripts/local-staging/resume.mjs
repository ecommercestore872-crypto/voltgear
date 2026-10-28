import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { docker, stagingDirectory } from './runtime.mjs';
import { projectId, requireOwnedLocalDocker } from './isolation.mjs';

// Resume only this previously created project. Never recreate/delete containers,
// change port mappings, stop shared workloads, or run a database reset.
assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0]);
const networkName = `${projectId}-loopback`;
const network = JSON.parse(docker(['network', 'inspect', networkName]))[0];
assert.equal(network.Labels?.['buyntry.staging.owner'], projectId);
assert.equal(network.Options?.['com.docker.network.bridge.host_binding_ipv4'], '127.0.0.1');
const names = ['db', 'kong', 'auth', 'rest', 'storage', 'inbucket', 'pg_meta', 'studio']
  .map((service) => `supabase_${service}_${projectId}`);
const containers = JSON.parse(docker(['inspect', ...names]));
for (const container of containers) {
  assert.ok(names.includes(container.Name.slice(1)));
  assert.equal(container.Config.Labels?.['com.supabase.cli.project'], projectId);
  assert.equal(container.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [networkName]);
  assert.equal(container.State.Running, false, 'Review a partially running stack before resuming');
  for (const bindings of Object.values(container.HostConfig.PortBindings ?? {})) {
    for (const binding of bindings ?? []) assert.ok(['', '127.0.0.1'].includes(binding.HostIp));
  }
}
assert.equal(Object.keys(network.Containers ?? {}).length, 0, 'Unexpected running network peers');
const started = [];
try {
  for (const name of names) {
    docker(['start', name]);
    started.push(name);
    const container = JSON.parse(docker(['inspect', name]))[0];
    for (const bindings of Object.values(container.NetworkSettings.Ports ?? {})) {
      for (const binding of bindings ?? []) assert.equal(binding.HostIp, '127.0.0.1', 'Non-loopback exposure forbidden');
    }
  }
  console.log(`Resumed ${started.length} verified owned containers; every actual published binding is loopback-only. Service/migration health still requires verification.`);
} catch (error) {
  for (const name of started.reverse()) docker(['stop', name]);
  throw error;
}
