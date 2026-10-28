import assert from 'node:assert/strict';
import { loadLocalRuntime } from './runtime.mjs';
const action = process.argv[2]; assert.ok(['block', 'restore'].includes(action));
const runtime = await loadLocalRuntime();
const signature = 'public.admin_validate_browser_session_v2(text)';
if (action === 'block') {
  assert.equal(runtime.sql(`SELECT has_function_privilege('service_role','${signature}','EXECUTE');`), 't');
  runtime.sql(`REVOKE EXECUTE ON FUNCTION ${signature} FROM service_role;`);
} else runtime.sql(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
console.log(JSON.stringify({ localValidatorEnabled: runtime.sql(`SELECT has_function_privilege('service_role','${signature}','EXECUTE');`) === 't' }));
