import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadLocalRuntime, root, stagingDirectory } from './runtime.mjs';
const runtime = await loadLocalRuntime();
const code = await readFile(join(root, 'apps/admin/.next/server/app/api/admin/login/route.js'), 'utf8');
const report = {
  // Boolean diagnostics only; never print generated code, keys or login tokens.
  urlReferencePresent: code.includes('NEXT_PUBLIC_SUPABASE_URL'),
  anonReferencePresent: code.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  localUrlEmbedded: code.includes(runtime.api),
  localAnonEmbedded: code.includes(runtime.values.ANON_KEY),
  recentSyntheticIdentity: JSON.parse(runtime.sql(`SELECT json_build_object('signedIn',last_sign_in_at IS NOT NULL,
    'authSessions',(SELECT count(*) FROM auth.sessions s WHERE s.user_id=u.id),
    'browserSessions',(SELECT count(*) FROM admin_browser_sessions b WHERE b.user_id=u.id))
    FROM auth.users u WHERE email LIKE 'release-%@example.invalid' ORDER BY created_at DESC LIMIT 1;`) || 'null'),
};
await writeFile(join(stagingDirectory, 'built-diagnostics.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
