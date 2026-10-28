import test from 'node:test';
import assert from 'node:assert/strict';
import { requireBrowserCertificateDates } from './browser-pki.mjs';

const start = Date.parse('2026-10-26T18:00:00Z');
const cert = { validFrom: new Date(start).toISOString(), validTo: new Date(start + 24 * 3600000).toISOString() };
test('live certificate checks reject future, expired and almost-expired test windows', () => {
  requireBrowserCertificateDates(cert, { now: start + 60000 });
  for (const now of [start - 1, start + 24 * 3600000, start + 24 * 3600000 - 4 * 60000])
    assert.throws(() => requireBrowserCertificateDates(cert, { now }));
});
test('metadata-only recovery permits expiry while retaining date-range validation', () => {
  requireBrowserCertificateDates(cert, { live: false, now: start + 48 * 3600000 });
  for (const invalid of [{ validFrom: 'invalid', validTo: cert.validTo }, { validFrom: cert.validTo, validTo: cert.validFrom },
    { validFrom: cert.validFrom, validTo: new Date(start + 48 * 3600000).toISOString() }])
    assert.throws(() => requireBrowserCertificateDates(invalid, { live: false }));
  assert.throws(() => requireBrowserCertificateDates(cert, { now: start + 48 * 3600000 }));
});
