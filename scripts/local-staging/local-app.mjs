import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import net from 'node:net';
import { root, commandEnvironment } from './runtime.mjs';
import { safeStartupDiagnostics } from './isolation.mjs';

export async function requireFreePort(port) {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); reject(new Error('Local test port occupied')); });
    socket.once('error', (error) => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve() : reject(new Error('Port ownership unknown')); });
    socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Local port probe timeout')); });
  });
}
export function localAppEnvironment(runtime, { email, secret, httpsCa } = {}) {
  assert.match(email, /^[a-z0-9-]+@example\.invalid$/); assert.ok(secret?.length >= 32);
  return { ...commandEnvironment(), NODE_ENV: 'development', NODE_OPTIONS: '--max-old-space-size=1024', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: httpsCa ? 'https://127.0.0.1:55421' : runtime.api,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY,
    ADMIN_TOKEN: secret, REVALIDATION_TOKEN: secret, ADMIN_AUTH_EMAILS: email,
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3300', STOREFRONT_URL: 'http://127.0.0.1:3300',
    ADMIN_PUBLIC_URL: 'http://127.0.0.1:3301', ADMIN_PROXY_UPSTREAM: 'http://127.0.0.1:3301',
    ...(httpsCa ? { NODE_EXTRA_CA_CERTS: httpsCa } : {}) };
}
export async function startLocalApp(name, environment, { productionBuild = false } = {}) {
  assert.ok(['admin', 'storefront'].includes(name)); const port = name === 'admin' ? 3301 : 3300;
  for (const directory of [root, join(root, 'apps', name)]) {
    assert.ok(!(await readdir(directory)).some((file) => file.startsWith('.env') && !file.endsWith('.example')), 'App dotenv forbidden');
  }
  await requireFreePort(port);
  const app = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), productionBuild ? 'start' : 'dev', '-H', '127.0.0.1', '-p', String(port)],
    { cwd: join(root, 'apps', name), env: { ...environment, ...(productionBuild ? { NODE_ENV: 'production' } : {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostic = '';
  for (const stream of [app.stdout, app.stderr]) stream.on('data', (chunk) => { diagnostic = (diagnostic + chunk).slice(-16_000); });
  const close = async () => {
    if (app.exitCode !== null) return;
    app.kill();
    await Promise.race([new Promise((resolve) => app.once('exit', resolve)), new Promise((resolve) => setTimeout(resolve, 5000))]);
  };
  try {
    for (let attempt = 0; attempt < 90; attempt++) {
      assert.equal(app.exitCode, null, 'Owned test app exited');
      try {
        const result = await fetch(`http://127.0.0.1:${port}${name === 'admin' ? '/admin/login' : '/robots.txt'}`,
          { redirect: 'error', signal: AbortSignal.timeout(3000) });
        if (result.ok) return { close, diagnostic: () => safeStartupDiagnostics(diagnostic),
          state: () => ({ pid: app.pid, exitCode: app.exitCode, signalCode: app.signalCode }) };
      } catch { /* bounded startup */ }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Owned test app readiness timeout');
  } catch (error) { await close(); throw error; }
}
