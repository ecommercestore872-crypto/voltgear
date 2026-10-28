import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { loadLocalRuntime, stagingDirectory } from './runtime.mjs';
import { localAppEnvironment, startLocalApp } from './local-app.mjs';

const runtime = await loadLocalRuntime();
const admin = 'http://127.0.0.1:3301';
const email = `sessions-${randomUUID()}@example.invalid`;
let password = randomUUID() + randomUUID();
const secret = randomUUID() + randomUUID();
const results = [];
let phase = 'startup'; let app; let userId; let failure; let requestId = 0;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const tokenHash = (cookie) => createHash('sha256').update(decodeURIComponent(cookie.split('=').slice(1).join('='))).digest('hex');
async function request(path, { method = 'GET', body, cookie, bearer, origin = admin } = {}) {
  return fetch(`${admin}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(90_000),
    headers: { 'Content-Type': 'application/json', Origin: origin, 'x-forwarded-for': `192.0.2.${++requestId}`,
      ...(cookie ? { Cookie: cookie } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
const check = async (name, action) => { phase = name; await action(); results.push({ name, passed: true }); console.log(`PASS: ${name}`); };
async function login() {
  const result = await request('/api/admin/login', { method: 'POST', body: { email, password } });
  assert.equal(result.status, 200);
  const header = result.headers.get('set-cookie');
  assert.match(header ?? '', /httponly/i); assert.match(header, /samesite=lax/i); assert.match(header, /max-age=28800/i);
  const cookie = header.split(';')[0]; assert.match(decodeURIComponent(cookie), /^vg_admin=v2\.[a-f0-9]{64}$/);
  return cookie;
}
const status = async (cookie) => (await request('/api/admin/products', { cookie })).status;
async function userUpdate(patch) {
  const result = await runtime.apiFetch(`/auth/v1/admin/users/${userId}`, { method: 'PUT',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
  assert.equal(result.status, 200);
}
try {
  const created = await runtime.apiFetch('/auth/v1/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }) });
  assert.equal(created.status, 200); userId = (await created.json()).id;
  app = await startLocalApp('admin', localAppEnvironment(runtime, { email, secret }));
  let first; let second;
  await check('unauthorized/malformed/legacy cookies denied; bearer preserved', async () => {
    const legacy = createHmac('sha256', secret).update('voltgear-admin-session-v1').digest('hex');
    for (const cookie of [undefined, `vg_admin=${secret}`, `vg_admin=${legacy}`, 'vg_admin=%E0%A4%A', `vg_admin=v2.${'0'.repeat(64)}`]) assert.equal(await status(cookie), 401);
    assert.equal((await request('/api/admin/products', { bearer: secret })).status, 200);
    assert.equal((await request('/api/admin/login', { method: 'POST', body: { password: secret } })).status, 401);
  });
  await check('unique hashed-only sessions with server expiry and protected page access', async () => {
    first = await login(); second = await login(); assert.ok(first !== second, 'Unique per-login credentials');
    assert.equal(await status(first), 200); assert.equal(await status(second), 200);
    const row = JSON.parse(runtime.sql(`SELECT json_build_object('count',count(*),'bound',bool_and(user_id=${quote(userId)}::uuid),
      'expiry',bool_and(expires_at>now() AND expires_at<=created_at+interval '8 hours')) FROM admin_browser_sessions
      WHERE token_hash IN (${quote(tokenHash(first))},${quote(tokenHash(second))});`));
    assert.deepEqual(row, { count: 2, bound: true, expiry: true });
    assert.equal((await request('/admin/products', { cookie: first })).status, 200);
  });
  await check('cross-origin logout denied; copied cookie rejected after valid logout; other session preserved', async () => {
    assert.equal((await request('/api/admin/logout', { method: 'POST', cookie: first, origin: 'https://untrusted.example.invalid' })).status, 401);
    assert.equal(await status(first), 200);
    const logout = await request('/api/admin/logout', { method: 'POST', cookie: first });
    assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie') ?? '', /max-age=0/i);
    assert.equal(await status(first), 401); assert.equal(await status(second), 200);
    assert.equal((await request('/admin/products', { cookie: first })).status, 307);
    assert.equal(runtime.sql(`SELECT revoked_at IS NOT NULL FROM admin_browser_sessions WHERE token_hash=${quote(tokenHash(first))};`), 't');
  });
  await check('server expiration denies copied cookie independently of browser Max-Age', async () => {
    runtime.sql(`UPDATE admin_browser_sessions SET created_at=now()-interval '3 seconds', expires_at=now()-interval '1 second'
      WHERE token_hash=${quote(tokenHash(second))};`);
    assert.equal(await status(second), 401);
  });
  await check('password change revokes old sessions; fresh login works', async () => {
    const old = await login(); password = randomUUID() + randomUUID(); await userUpdate({ password });
    assert.equal(await status(old), 401); assert.equal(await status(await login()), 200);
  });
  await check('ban/unban never revive the old session', async () => {
    const old = await login(); await userUpdate({ ban_duration: '1h' }); assert.equal(await status(old), 401);
    await userUpdate({ ban_duration: 'none' }); assert.equal(await status(old), 401); assert.equal(await status(await login()), 200);
  });
  await check('email change/reversal never revive the old session', async () => {
    const old = await login(); await userUpdate({ email: `changed-${randomUUID()}@example.invalid`, email_confirm: true });
    assert.equal(await status(old), 401); await userUpdate({ email, email_confirm: true });
    assert.equal(await status(old), 401); assert.equal(await status(await login()), 200);
  });
  await check('Auth global signout invalidates linked browser sessions', async () => {
    const old = await login();
    const signed = await runtime.apiFetch('/auth/v1/token?grant_type=password', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }, 'anon');
    assert.equal(signed.status, 200); const identity = await signed.json();
    const out = await runtime.apiFetch('/auth/v1/logout?scope=global', { method: 'POST', headers: { Authorization: `Bearer ${identity.access_token}` } }, 'anon');
    assert.equal(out.status, 204); assert.equal(await status(old), 401);
  });
  await check('identity changed between password verification and session creation is rejected', async () => {
    const signed = await runtime.apiFetch('/auth/v1/token?grant_type=password', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }, 'anon');
    assert.equal(signed.status, 200); const identity = await signed.json();
    const claims = JSON.parse(Buffer.from(identity.access_token.split('.')[1], 'base64url').toString());
    await userUpdate({ user_metadata: { syntheticRace: randomUUID() } });
    const hash = createHash('sha256').update(randomUUID()).digest('hex');
    const created = await runtime.apiFetch('/rest/v1/rpc/admin_create_browser_session_v2', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token_hash: hash,
        p_user_id: userId, p_auth_session_id: claims.session_id, p_user_updated_at: identity.user.updated_at }) });
    assert.ok([400, 401, 403].includes(created.status));
    assert.equal(runtime.sql(`SELECT count(*) FROM admin_browser_sessions WHERE token_hash=${quote(hash)};`), '0');
  });
  await check('password self-service updates the browser actor and invalidates its cookie', async () => {
    const cookie = await login(); password = randomUUID() + randomUUID();
    const response = await request('/api/admin/update-password', { method: 'POST', cookie, body: { password } });
    assert.equal(response.status, 200); assert.equal(await status(cookie), 401); assert.equal(await status(await login()), 200);
  });
  await check('failed revocation does not claim logout; retry revokes and bearer logout still works', async () => {
    const cookie = await login();
    try {
      runtime.sql('REVOKE EXECUTE ON FUNCTION public.admin_revoke_browser_session_v2(text) FROM service_role;');
      const response = await request('/api/admin/logout', { method: 'POST', cookie });
      assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null); assert.equal(await status(cookie), 200);
    } finally { runtime.sql('GRANT EXECUTE ON FUNCTION public.admin_revoke_browser_session_v2(text) TO service_role;'); }
    assert.equal((await request('/api/admin/logout', { method: 'POST', cookie })).status, 200); assert.equal(await status(cookie), 401);
    assert.equal((await request('/api/admin/logout', { method: 'POST', bearer: secret, origin: '' })).status, 200);
  });
  await check('public roles cannot create/validate/revoke or read browser sessions', async () => {
    const signatures = JSON.parse(runtime.sql("SELECT json_agg(p.oid::regprocedure::text) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_create_browser_session_v2','admin_validate_browser_session_v2','admin_revoke_browser_session_v2');"));
    assert.equal(signatures.length, 3);
    for (const role of ['anon', 'authenticated']) {
      for (const signature of signatures) assert.equal(runtime.sql(`SELECT has_function_privilege(${quote(role)},${quote(signature)},'EXECUTE');`), 'f');
      assert.equal(runtime.sql(`SELECT has_table_privilege(${quote(role)},'public.admin_browser_sessions','SELECT');`), 'f');
    }
    assert.equal(runtime.sql("SELECT has_table_privilege('service_role','public.admin_browser_sessions','SELECT');"), 'f');
  });
  await check('unavailable validator fails closed; restore recovers without legacy fallback', async () => {
    const cookie = await login();
    try {
      runtime.sql('REVOKE EXECUTE ON FUNCTION public.admin_validate_browser_session_v2(text) FROM service_role;');
      assert.equal(await status(cookie), 401);
      assert.equal((await request('/api/admin/products', { bearer: secret })).status, 200);
    } finally { runtime.sql('GRANT EXECUTE ON FUNCTION public.admin_validate_browser_session_v2(text) TO service_role;'); }
    assert.equal(await status(cookie), 200);
  });
} catch (error) {
  failure = true;
  console.error(JSON.stringify({ failedPhase: phase, actual: typeof error.actual === 'number' ? error.actual : undefined,
    expected: typeof error.expected === 'number' ? error.expected : undefined }));
} finally {
  await app?.close();
  await writeFile(join(stagingDirectory, 'session-results.json'), JSON.stringify({ passed: !failure, results, userId,
    productionTouched: false, credentialsLogged: false }, null, 2));
}
if (failure) process.exitCode = 1;
