import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { docker, stagingDirectory } from './runtime.mjs';
import { projectId, productionRef, requireOwnedLocalDocker } from './isolation.mjs';
import { copyKongRuntimeFiles } from './kong-files.mjs';

// Docker Desktop may ignore a bridge's default host binding. Recreate metadata
// with explicit loopback ports, retaining stopped originals and every volume.
// Secret-bearing inspect/config objects stay in memory and are never logged.
assert.equal(await readFile(join(stagingDirectory, 'OWNER'), 'utf8'), projectId);
requireOwnedLocalDocker(JSON.parse(docker(['context', 'inspect', 'desktop-linux']))[0]);
const networkName = `${projectId}-loopback`;
const network = JSON.parse(docker(['network', 'inspect', networkName]))[0];
assert.equal(network.Labels?.['buyntry.staging.owner'], projectId);
assert.equal(Object.keys(network.Containers ?? {}).length, 0);
const names = ['db', 'kong', 'auth', 'rest', 'storage', 'inbucket', 'pg_meta', 'studio'].map((service) => `supabase_${service}_${projectId}`);
const originals = JSON.parse(docker(['inspect', ...names]));
for (const item of originals) {
  assert.equal(item.State.Running, false);
  assert.equal(item.Config.Labels?.['com.supabase.cli.project'], projectId);
  assert.equal(item.Config.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
  assert.deepEqual(Object.keys(item.NetworkSettings.Networks), [networkName]);
  assert.equal(item.HostConfig.AutoRemove, false);
  assert.ok(!JSON.stringify(item.Config.Env).toLowerCase().includes(productionRef));
}
const suffix = randomUUID().slice(0, 8);
const ledger = [];
async function api(path, body) {
  return new Promise((resolve, reject) => {
    const bytes = JSON.stringify(body);
    const request = http.request({ socketPath: '\\\\.\\pipe\\dockerDesktopLinuxEngine',
      path: `/v1.55${path}`, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bytes) } }, (response) => {
      let result = '';
      response.setEncoding('utf8'); response.on('data', (chunk) => { result += chunk; });
      response.on('end', () => {
        if (response.statusCode !== 201) return reject(new Error(`Local container creation failed (${response.statusCode}); original retained`));
        resolve(JSON.parse(result).Id);
      });
    });
    request.setTimeout(30_000, () => request.destroy(new Error('Local Docker API timeout')));
    request.on('error', reject); request.end(bytes);
  });
}
try {
  for (const item of originals) {
    const name = item.Name.slice(1);
    assert.ok(names.includes(name));
    const backup = `${name}_before_loopback_${suffix}`;
    const record = { originalId: item.Id, name, backup, replacementId: null };
    docker(['rename', item.Id, backup]);
    ledger.push(record);
    const ports = Object.fromEntries(Object.entries(item.HostConfig.PortBindings ?? {}).map(([port, bindings]) =>
      [port, (bindings ?? []).map((binding) => ({ ...binding, HostIp: '127.0.0.1' }))]));
    const aliases = (item.NetworkSettings.Networks[networkName].Aliases ?? []).filter((alias) => alias !== item.Id.slice(0, 12));
    record.replacementId = await api(`/containers/create?name=${encodeURIComponent(name)}`, {
      ...item.Config, Image: item.Image,
      Labels: { ...item.Config.Labels, 'buyntry.loopback-replacement-of': item.Id },
      HostConfig: { ...item.HostConfig, PortBindings: ports, NetworkMode: networkName },
      NetworkingConfig: { EndpointsConfig: { [networkName]: { Aliases: aliases } } },
    });
    const replacement = JSON.parse(docker(['inspect', record.replacementId]))[0];
    const volumes = (entry) => entry.Mounts.map((mount) => ({ type: mount.Type, source: mount.Source, target: mount.Destination })).sort((a, b) => a.target.localeCompare(b.target));
    assert.deepEqual(volumes(replacement), volumes(item), 'Volume identity must remain unchanged');
    assert.equal(replacement.State.Running, false);
    assert.deepEqual(replacement.HostConfig.PortBindings ?? {}, ports);
    if (name === `supabase_kong_${projectId}`) copyKongRuntimeFiles(item.Id, record.replacementId);
  }
  console.log(`Prepared explicit loopback replacements for ${ledger.length} owned containers. Originals and volumes retained; nothing started.`);
} finally {
  // Nonsecret recovery metadata only. On partial failure inspect this exact ledger;
  // no automatic deletion, data restore, or unrelated process cleanup is attempted.
  await writeFile(join(stagingDirectory, `loopback-recovery-${suffix}.json`), JSON.stringify(ledger, null, 2));
}
