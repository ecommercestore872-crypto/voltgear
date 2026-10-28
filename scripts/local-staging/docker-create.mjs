import assert from 'node:assert/strict';
import http from 'node:http';
import { projectId } from './isolation.mjs';
import { stagingDirectory } from './runtime.mjs';

/** Exact local Docker API; config/env objects and response bodies never logged. */
export async function createOwnedContainer(name, body) {
  assert.ok(name.startsWith('supabase_') && name.endsWith(`_${projectId}`));
  assert.equal(body.Labels?.['com.supabase.cli.project'], projectId);
  assert.equal(body.Labels?.['com.supabase.cli.workdir'], stagingDirectory);
  assert.equal(body.HostConfig.NetworkMode, `${projectId}-loopback`);
  for (const bindings of Object.values(body.HostConfig.PortBindings ?? {})) {
    for (const binding of bindings ?? []) assert.equal(binding.HostIp, '127.0.0.1');
  }
  return new Promise((resolve, reject) => {
    const bytes = JSON.stringify(body);
    const request = http.request({ socketPath: '\\\\.\\pipe\\dockerDesktopLinuxEngine',
      path: `/v1.55/containers/create?name=${encodeURIComponent(name)}`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bytes) } }, (response) => {
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
