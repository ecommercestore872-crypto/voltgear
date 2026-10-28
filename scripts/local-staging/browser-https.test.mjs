import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedBrowserProxyRequest, browserProxyLocation, strictBrowserRequest } from './browser-https.mjs';

test('fixed loopback proxy rejects public hosts, absolute targets and unsupported services', () => {
  const make = (url, host = '127.0.0.1:33443', method = 'GET') => ({ url, method, headers: { host } });
  assert.equal(allowedBrowserProxyRequest('admin', 33443, make('/admin/login')), true);
  for (const url of ['https://example.com/', '//example.com/', '/a\\b', '/a#x', '/a\r\n'])
    assert.equal(allowedBrowserProxyRequest('admin', 33443, make(url)), false);
  assert.equal(allowedBrowserProxyRequest('admin', 33443, make('/admin', 'example.com')), false);
  assert.equal(allowedBrowserProxyRequest('admin', 33443, make('/admin', '127.0.0.1:33443', 'CONNECT')), false);
  assert.equal(allowedBrowserProxyRequest('admin', 33444, make('/admin')), false);
  assert.equal(allowedBrowserProxyRequest('unknown', 33443, make('/')), false);
});
test('media proxy exposes only local Auth, REST and Storage namespaces', () => {
  const make = (url) => ({ url, method: 'GET', headers: { host: '127.0.0.1:55421' } });
  for (const url of ['/auth/v1/health', '/rest/v1/products', '/storage/v1/object/public/product-images/a.png'])
    assert.equal(allowedBrowserProxyRequest('media', 55421, make(url)), true);
  for (const url of ['/admin', '/auth/v10/x', '/rest/v1x', '/functions/v1/x'])
    assert.equal(allowedBrowserProxyRequest('media', 55421, make(url)), false);
});
test('strict test client refuses non-local URLs before opening a socket', () => {
  for (const url of ['https://example.com/', 'http://127.0.0.1:33443/', 'https://127.0.0.1:443/', 'https://user:pass@127.0.0.1:33443/'])
    assert.throws(() => strictBrowserRequest({}, url));
});
test('redirects from fixed internal ports use the same trusted HTTPS service', () => {
  for (const [name, internal, external] of [['admin', 3301, 33443], ['storefront', 3300, 33444], ['media', 55321, 55421]]) {
    const path = name === 'media' ? '/auth/v1/authorize?next=ok' : '/admin/login?next=%2Fadmin';
    const expected = `https://127.0.0.1:${external}${path}`;
    for (const protocol of ['http', 'https']) for (const host of ['localhost', '127.0.0.1'])
      assert.equal(browserProxyLocation(name, `${protocol}://${host}:${internal}${path}`), expected);
    assert.equal(browserProxyLocation(name, path), expected);
    assert.equal(browserProxyLocation(name, expected), expected);
  }
});
test('redirects reject foreign origins, cross-service ports and ambiguous targets', () => {
  for (const location of ['https://example.com/', '//example.com/', 'https://127.0.0.1:3300/admin',
    'https://127.0.0.1:443/admin', 'http://127.0.0.1:33443/admin',
    'https://localhost:33443/admin', 'https://user@localhost:3301/admin',
    'https://127.1:3301/admin', '/a\\b', '/a\r\nb', '/a#b', 'admin/login', ''])
    assert.throws(() => browserProxyLocation('admin', location));
  assert.throws(() => browserProxyLocation('unknown', '/admin'));
  assert.throws(() => browserProxyLocation('admin', ['/admin']));
});
test('media redirects cannot escape the allowed API namespaces', () => {
  for (const location of ['/admin', 'https://localhost:55321/functions/v1/x',
    'https://localhost:55321/rest/v1/../../admin', '/rest/v1/../../admin',
    '/rest/v1/%2e%2e/%2E%2e/admin', 'https://localhost:55321/rest/v1/%2e%2e/%2e%2e/admin'])
    assert.throws(() => browserProxyLocation('media', location));
});
