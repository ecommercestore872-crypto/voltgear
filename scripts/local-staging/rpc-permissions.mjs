import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadLocalRuntime } from './runtime.mjs';

const runtime = await loadLocalRuntime();
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const password = randomUUID() + randomUUID();
const email = `rpc-${randomUUID()}@example.invalid`;
const user = await runtime.apiFetch('/auth/v1/admin/users', json({ email, password, email_confirm: true }));
assert.equal(user.status, 200);
const login = await runtime.apiFetch('/auth/v1/token?grant_type=password', json({ email, password }), 'anon');
if (login.status !== 200) {
  const error = await login.clone().json();
  console.error(JSON.stringify({ status: login.status, code: /^[a-z_]+$/.test(error.error_code ?? '') ? error.error_code : 'unclassified' }));
}
assert.equal(login.status, 200, 'Actual isolated Auth password login');
const session = await login.json();
assert.ok(session.access_token);
console.log('PASS: real local Auth password session (credential values not logged).');
const signup = await runtime.apiFetch('/auth/v1/signup', json({ email: `blocked-${randomUUID()}@example.invalid`, password }), 'anon');
assert.equal(signup.status, 422);
assert.equal((await signup.json()).error_code, 'signup_disabled');
console.log('PASS: public Auth signup remains disabled.');
const path = '/rest/v1/rpc/admin_collection_snapshot_v1';
const options = json({ p_id: randomUUID() });
const anonymous = await runtime.apiFetch(path, options, 'anon');
assert.equal(anonymous.status, 401);
console.log('PASS: anonymous PostgREST snapshot RPC denied HTTP401.');
const authenticated = await runtime.apiFetch(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` } }, 'anon');
assert.equal(authenticated.status, 403);
console.log('PASS: authenticated non-service PostgREST snapshot RPC denied HTTP403.');
const service = await runtime.apiFetch(path, options);
assert.equal(service.status, 200);
assert.equal(await service.json(), null);
console.log('PASS: service-role snapshot RPC visible through actual schema cache.');
const missing = await runtime.apiFetch('/rest/v1/rpc/acceptance_deliberately_missing', json({}));
assert.equal(missing.status, 404);
assert.equal((await missing.json()).code, 'PGRST202');
console.log('PASS: missing RPC reports actual PostgREST PGRST202 (application503 translation remains separate).');
