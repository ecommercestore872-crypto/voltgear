import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import net from 'node:net';
import { loadLocalRuntime, commandEnvironment, root, stagingDirectory } from './runtime.mjs';
import { safeStartupDiagnostics } from './isolation.mjs';
import { startHttpsMedia } from './https-media.mjs';

const runtime = await loadLocalRuntime();
for (const directory of [root, join(root, 'apps/admin'), join(root, 'apps/storefront')]) {
  assert.ok(!(await readdir(directory)).some((name) => name.startsWith('.env') && !name.endsWith('.example')));
}
const email = `browser-${randomUUID()}@example.invalid`;
const password = randomUUID() + randomUUID();
const secret = randomUUID() + randomUUID();
const admin = 'http://127.0.0.1:3301';
const shop = 'http://127.0.0.1:3300';
const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true }) });
assert.equal(created.status, 200);
const mediaTls = process.argv.includes('--https-media') ? await startHttpsMedia(runtime) : undefined;
const productionBuild = process.argv.includes('--production-build');
const environment = { ...commandEnvironment(), NODE_ENV: productionBuild ? 'production' : 'development', NODE_OPTIONS: '--max-old-space-size=1024', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: mediaTls?.origin ?? runtime.api, NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY, ADMIN_TOKEN: secret, REVALIDATION_TOKEN: secret,
  ADMIN_AUTH_EMAILS: email, NEXT_PUBLIC_SITE_URL: shop, STOREFRONT_URL: shop, ADMIN_PUBLIC_URL: admin, ADMIN_PROXY_UPSTREAM: admin,
  ...(mediaTls ? { NODE_EXTRA_CA_CERTS: mediaTls.caPath } : {}) };
const apps = [];
const credentialsPath = join(stagingDirectory, 'browser-input.json');
let ending = false;
async function close() {
  if (ending) return;
  ending = true;
  for (const app of apps) app.kill();
  await mediaTls?.close();
  await unlink(credentialsPath).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}
process.once('SIGINT', () => { void close().finally(() => process.exit()); });
process.once('SIGTERM', () => { void close().finally(() => process.exit()); });
try {
  for (const [name, port] of [['storefront', 3300], ['admin', 3301]]) {
    await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => { socket.destroy(); reject(new Error('Port occupied')); });
      socket.once('error', (error) => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve() : reject(new Error('Port ownership unknown')); });
      socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Port probe timeout')); });
    });
    const app = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), productionBuild ? 'start' : 'dev', '-H', '127.0.0.1', '-p', String(port)],
      { cwd: join(root, 'apps', name), env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
    let diagnosticBuffer = '';
    const capture = (chunk) => { diagnosticBuffer = (diagnosticBuffer + String(chunk)).slice(-16_000); };
    app.stdout.on('data', capture); app.stderr.on('data', capture);
    app.on('exit', (code, signal) => {
      if (!ending) console.error(JSON.stringify({ ownedAppExited: name, code, signal,
        diagnostics: safeStartupDiagnostics(diagnosticBuffer) }));
    });
    apps.push(app);
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      assert.equal(app.exitCode, null);
      try {
        const response = await fetch(`http://127.0.0.1:${port}${name === 'admin' ? '/admin/login' : '/robots.txt'}`,
          { redirect: 'error', signal: AbortSignal.timeout(3000) });
        if (response.ok) { ready = true; break; }
      } catch { /* cold compilation */ }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(ready, 'Local browser server readiness');
  }
  // Ephemeral synthetic credentials only, ignored tmp directory; never logged.
  await writeFile(credentialsPath, JSON.stringify({ email, password }), { flag: 'wx', mode: 0o600 });
  console.log(`READY: isolated browser servers on3300/3301. Production build=${productionBuild}. Media TLS=${Boolean(mediaTls)} (Node process trust only; browser trust is NOT assumed). Ephemeral synthetic login input prepared privately; values not logged. Auto-stop in20 minutes.`);
  await new Promise((resolve) => setTimeout(resolve, 20 * 60_000));
} finally { await close(); }
