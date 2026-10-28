import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { requireFreePort } from './local-app.mjs';

export const browserOrigins = Object.freeze({
  admin: 'https://127.0.0.1:33443', storefront: 'https://127.0.0.1:33444', media: 'https://127.0.0.1:55421',
});
const routes = Object.freeze([
  { port: 33443, upstream: 3301, name: 'admin' },
  { port: 33444, upstream: 3300, name: 'storefront' },
  { port: 55421, upstream: 55321, name: 'media' },
]);
function headersWithoutHopByHop(headers) {
  const omitted = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
    ...String(headers.connection ?? '').toLowerCase().split(',').map((part) => part.trim())]);
  return Object.fromEntries(Object.entries(headers).filter(([key]) => !omitted.has(key.toLowerCase())));
}
export function allowedBrowserProxyRequest(name, port, request) {
  if (!routes.some((route) => route.name === name && route.port === port)) return false;
  if (request.headers.host !== `127.0.0.1:${port}`) return false;
  if (['CONNECT', 'TRACE'].includes(request.method)) return false;
  const path = request.url ?? '';
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\r\n#]/.test(path)) return false;
  return name !== 'media' || /^\/(auth|rest|storage)\/v1(?:\/|\?|$)/.test(path);
}
export function browserProxyLocation(name, location) {
  const route = routes.find((item) => item.name === name);
  assert.ok(route && typeof location === 'string' && location.length > 0);
  assert.ok(!/[\\\s#]/.test(location), 'Unsupported local redirect');
  let path;
  if (location.startsWith('/') && !location.startsWith('//')) {
    const target = new URL(location, browserOrigins[name]);
    path = target.pathname + target.search;
  }
  else {
    // Only the current service's exact public or internal loopback origin is
    // translated. Never normalize arbitrary host spellings or follow a redirect.
    assert.match(location, /^https?:\/\/(?:localhost|127\.0\.0\.1):[0-9]+(?:\/|\?|$)/);
    const target = new URL(location);
    assert.ok(!target.username && !target.password);
    assert.ok(target.origin === browserOrigins[name] ||
      ['http:', 'https:'].some((protocol) =>
        ['localhost', '127.0.0.1'].some((host) => target.origin === `${protocol}//${host}:${route.upstream}`)),
    'Redirect must belong to the current local service');
    path = target.pathname + target.search;
  }
  assert.ok(allowedBrowserProxyRequest(name, route.port,
    { url: path, method: 'GET', headers: { host: `127.0.0.1:${route.port}` } }));
  return browserOrigins[name] + path;
}
export async function startBrowserHttps(pki) {
  for (const route of routes) await requireFreePort(route.port);
  const servers = [];
  const key = await readFile(pki.keyPath); const cert = await readFile(pki.certPath);
  const close = async () => {
    for (const server of servers) server.closeAllConnections();
    await Promise.all(servers.map((server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
    for (const route of routes) await requireFreePort(route.port);
  };
  try {
    for (const route of routes) {
      const server = https.createServer({ key, cert, minVersion: 'TLSv1.2' }, (request, response) => {
        if (!allowedBrowserProxyRequest(route.name, route.port, request)) { response.writeHead(400).end(); request.resume(); return; }
        const headers = headersWithoutHopByHop(request.headers);
        delete headers.forwarded;
        for (const name of Object.keys(headers)) if (name.startsWith('x-forwarded-')) delete headers[name];
        // Fixed target/forwarding values only: never proxy to a request-supplied host.
        headers.host = `127.0.0.1:${route.port}`;
        headers['x-forwarded-host'] = headers.host;
        headers['x-forwarded-proto'] = 'https';
        headers['x-forwarded-port'] = String(route.port);
        const upstream = http.request({ hostname: '127.0.0.1', port: route.upstream, method: request.method,
          path: request.url, headers, timeout: 90000 }, (result) => {
          const outgoing = headersWithoutHopByHop(result.headers);
          if (outgoing.location !== undefined) {
            try { outgoing.location = browserProxyLocation(route.name, outgoing.location); }
            catch { result.resume(); response.writeHead(502).end(); return; }
          }
          // Redirects are returned to the browser, never followed by this proxy.
          response.writeHead(result.statusCode, outgoing); result.pipe(response);
          result.on('error', () => response.destroy());
        });
        upstream.on('timeout', () => upstream.destroy());
        upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
        request.on('aborted', () => upstream.destroy());
        response.on('close', () => { if (!response.writableEnded) upstream.destroy(); });
        request.pipe(upstream);
      });
      server.on('upgrade', (_request, socket) => socket.destroy());
      server.on('connect', (_request, socket) => socket.destroy());
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(route.port, '127.0.0.1', resolve); });
      assert.equal(server.address().address, '127.0.0.1'); servers.push(server);
    }
    return { close };
  } catch (error) { await close(); throw error; }
}
export function strictBrowserRequest(pki, url, { method = 'GET', headers = {}, body, trustCa = true } = {}) {
  const target = new URL(url);
  assert.ok(Object.values(browserOrigins).includes(target.origin), 'Only fixed browser test origins permitted');
  assert.ok(!target.username && !target.password && !target.hash);
  return new Promise((resolve, reject) => {
    // IP URL: suppress Host-header-derived SNI; normal certificate IP verification remains enabled.
    const request = https.request(target, { method, headers, servername: '', ...(trustCa ? { ca: pki.ca } : {}), rejectUnauthorized: true,
      timeout: 90000, agent: false }, (response) => {
      const chunks = []; let size = 0; const authorized = response.socket.authorized;
      response.on('data', (part) => { size += part.length; if (size > 8 * 1024 * 1024) request.destroy(new Error('Test response too large')); else chunks.push(part); });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers,
        authorized, body: Buffer.concat(chunks) }));
    });
    request.on('error', reject); request.on('timeout', () => request.destroy(new Error('Local TLS request timeout')));
    request.end(body);
  });
}
