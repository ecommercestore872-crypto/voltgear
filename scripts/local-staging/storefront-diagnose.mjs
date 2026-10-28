import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import net from 'node:net';
import { loadLocalRuntime, commandEnvironment, root } from './runtime.mjs';
import { safeStartupDiagnostics } from './isolation.mjs';
const runtime = await loadLocalRuntime();
const slug = process.argv[2];
assert.match(slug ?? '', /^browser-isolated-acceptance-[a-z0-9-]+$/, 'Provide the synthetic browser fixture slug');
await new Promise((resolve, reject) => {
  const socket = net.createConnection({ host: '127.0.0.1', port: 3300 });
  socket.once('connect', () => { socket.destroy(); reject(new Error('Port3300 occupied')); });
  socket.once('error', (error) => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve() : reject(error); });
  socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Port probe timeout')); });
});
const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', '3300'], {
  cwd: join(root, 'apps/storefront'), env: { ...commandEnvironment(), NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SUPABASE_URL: runtime.api, NEXT_PUBLIC_SUPABASE_ANON_KEY: runtime.values.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: runtime.values.SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3300',
    ADMIN_TOKEN: randomUUID(), ADMIN_PROXY_UPSTREAM: 'http://127.0.0.1:3301' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', (data) => { log = (log + data).slice(-24_000); });
child.stderr.on('data', (data) => { log = (log + data).slice(-24_000); });
const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) break;
    try { const r = await fetch('http://127.0.0.1:3300/robots.txt', { redirect: 'error', signal: AbortSignal.timeout(2000) }); if (r.ok) { ready = true; break; } } catch { /* bounded */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Storefront diagnostic readiness');
  try {
    const response = await fetch(`http://127.0.0.1:3300/product/${slug}`, { redirect: 'error', signal: AbortSignal.timeout(60_000) });
    console.log(JSON.stringify({ pdpStatus: response.status })); await response.body?.cancel();
  } catch (error) { console.error(JSON.stringify({ pdpError: error.cause?.code ?? error.name })); }
} finally {
  if (child.exitCode === null) child.kill();
  const result = await exited;
  console.log(JSON.stringify({ ownedDiagnosticExit: result, diagnostics: safeStartupDiagnostics(log) }));
}
