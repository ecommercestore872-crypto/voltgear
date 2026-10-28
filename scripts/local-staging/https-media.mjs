import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import https from 'node:https';
import http from 'node:http';
import { stagingDirectory, commandEnvironment } from './runtime.mjs';
import { requireFreePort } from './local-app.mjs';

// TLS is trusted explicitly by this test client / child Node process only.
// Never install a certificate in Windows/Chrome, disable validation, or use a
// hosted tunnel. Production HTTPS validation and application config stay intact.
export async function startHttpsMedia(runtime) {
  assert.equal(runtime.api, 'http://127.0.0.1:55321');
  await requireFreePort(55421);
  const directory = join(stagingDirectory, `https-${randomUUID()}`);
  await mkdir(directory, { mode: 0o700 });
  const keyPath = join(directory, 'key.pem'); const caPath = join(directory, 'cert.pem');
  // Observed local Git-bundled OpenSSL; no package download or global install.
  execFileSync('D:\\D FROM CHROME\\Git\\usr\\bin\\openssl.exe', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=Buy N Try isolated loopback acceptance', '-addext', 'subjectAltName=IP:127.0.0.1',
    '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'extendedKeyUsage=serverAuth',
    '-keyout', keyPath, '-out', caPath], { env: commandEnvironment(), stdio: 'ignore', timeout: 15_000 });
  const ca = await readFile(caPath);
  const server = https.createServer({ key: await readFile(keyPath), cert: ca, minVersion: 'TLSv1.2' }, (request, response) => {
    if (!/^\/(auth|rest|storage)\/v1(?:\/|\?|$)/.test(request.url ?? '') || /[\\\r\n]/.test(request.url ?? '')) {
      response.writeHead(404).end(); return;
    }
    const upstream = http.request({ hostname: '127.0.0.1', port: 55321, method: request.method,
      path: request.url, headers: { ...request.headers, host: '127.0.0.1:55321' }, timeout: 20_000 }, (result) => {
      if (result.statusCode >= 300 && result.statusCode < 400) { result.resume(); response.writeHead(502).end(); return; }
      response.writeHead(result.statusCode, result.headers); result.pipe(response);
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    request.on('aborted', () => upstream.destroy()); request.pipe(upstream);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(55421, '127.0.0.1', resolve); });
  const close = async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); };
  const get = (url) => new Promise((resolve, reject) => {
    const target = new URL(url);
    assert.equal(target.origin, 'https://127.0.0.1:55421');
    const request = https.get(target, { ca, rejectUnauthorized: true, timeout: 20_000 }, (response) => {
      const authorized = response.socket.authorized;
      const chunks = []; response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, bytes: Buffer.concat(chunks), authorized }));
    });
    request.on('error', reject); request.on('timeout', () => request.destroy(new Error('Local HTTPS timeout')));
  });
  try { assert.equal((await get('https://127.0.0.1:55421/auth/v1/health')).status, 200); }
  catch (error) { await close(); throw error; }
  return { caPath, get, close, origin: 'https://127.0.0.1:55421' };
}
