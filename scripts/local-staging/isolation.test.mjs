import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isolatedProcessEnvironment, productionRef, requireLocalEndpoint, requireOwnedLocalDocker, requireMigrationInventory, safeStartupDiagnostics, requireSafeCliCache } from './isolation.mjs';

test('only exact dedicated loopback API is accepted', () => {
  assert.equal(requireLocalEndpoint('http://127.0.0.1:55321', 55321), 'http://127.0.0.1:55321');
  for (const endpoint of [undefined, '', `https://${productionRef}.supabase.co`,
    `https://${productionRef.toUpperCase()}.supabase.co`, 'http://localhost:55321',
    'http://127.0.0.1:54321', 'http://127.0.0.1:55321/', 'http://127.0.0.1:55321@evil.test',
    'http://127.0.0.1:55321?redirect=production', 'http://127.0.0.1:55321/auth/v1',
    'http://127.1:55321', 'https://staging.supabase.co']) {
    assert.throws(() => requireLocalEndpoint(endpoint, 55321));
  }
});

test('child process cannot inherit credentials, remote targets or provider switches', () => {
  const env = isolatedProcessEnvironment({ PATH: 'tools', SystemRoot: 'windows',
    SUPABASE_ACCESS_TOKEN: 'not-a-real-token', SUPABASE_SERVICE_ROLE_KEY: 'not-a-real-key',
    DATABASE_URL: 'remote', DOCKER_HOST: 'tcp://remote', DOCKER_CONTEXT: 'remote',
    NODE_OPTIONS: '--import evil', CLOUDINARY_URL: 'remote', POSTEX_TOKEN: 'remote',
    RESEND_API_KEY: 'remote', NEXT_PUBLIC_SUPABASE_URL: 'remote', ADMIN_TOKEN: 'remote' });
  assert.deepEqual(env, { PATH: 'tools', SystemRoot: 'windows', SUPABASE_TELEMETRY_DISABLED: 'true' });
});

test('remote Docker daemons are rejected', () => {
  requireOwnedLocalDocker({ Endpoints: { docker: { Host: 'npipe:////./pipe/dockerDesktopLinuxEngine' } } });
  for (const Host of ['tcp://remote:2375', 'ssh://remote', '', 'unix:///remote', 'npipe:////remote-host/pipe/docker_engine']) {
    assert.throws(() => requireOwnedLocalDocker({ Endpoints: { docker: { Host } } }));
  }
});

test('migration inventories must be complete, nonempty and version-unique', () => {
  const names = ['1_first.sql', '2_second.sql'];
  requireMigrationInventory(names, [...names].reverse(), names);
  for (const staged of [[], ['1_first.sql'], [...names, '3_extra.sql'], [...names, '2_duplicate.sql']]) {
    assert.throws(() => requireMigrationInventory(names, staged, names));
  }
  assert.throws(() => requireMigrationInventory(names, names, []));
  assert.throws(() => requireMigrationInventory([], [], []));
});

test('startup diagnostics suppress credential-bearing lines', () => {
  assert.equal(safeStartupDiagnostics('API key: hidden\nERROR password hidden\nApplying migration 1_init.sql\nERROR invalid config\nERROR JWT hidden\nINFO ready'),
    'Applying migration 1_init.sql\nERROR invalid config');
  assert.equal(safeStartupDiagnostics('failed to copy: https://registry.example.invalid/blob?Encoded=private-download-credential#fragment'),
    'failed to copy: https://registry.example.invalid/blob');
});

test('only harmless CLI latest-version metadata is accepted', () => {
  requireSafeCliCache([['cli-latest', 'v2.122.0\n']]);
  assert.throws(() => requireSafeCliCache([['project-ref', productionRef]]));
  assert.throws(() => requireSafeCliCache([['cli-latest', 'https://remote.example']]));
});
