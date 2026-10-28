import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { readdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { root, stagingDirectory } from './runtime.mjs';
import { isolatedProcessEnvironment } from './isolation.mjs';
import { requireFreePort } from './local-app.mjs';

// Equivalent to the two workspace `next build` commands, with no inherited
// provider/production credentials and no simultaneous dev compiler in .next.
for (const port of [3300, 3301]) await requireFreePort(port);
for (const directory of [root, join(root, 'apps/admin'), join(root, 'apps/storefront')]) {
  assert.ok(!(await readdir(directory)).some((file) => file.startsWith('.env') && !file.endsWith('.example')), 'App dotenv forbidden');
}
const env = { ...isolatedProcessEnvironment(), NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=1536',
  NEXT_TELEMETRY_DISABLED: '1', ADMIN_TOKEN: randomUUID() + randomUUID(), NEXT_PUBLIC_SITE_URL: 'https://buyntryy.com' };
const results = [];
for (const name of ['storefront', 'admin']) {
  const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'build'],
    { cwd: join(root, 'apps', name), env, stdio: 'inherit' });
  const status = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  results.push({ name, exitCode: status });
  await writeFile(join(stagingDirectory, 'build-results.json'), JSON.stringify({ results }, null, 2));
  assert.equal(status, 0, `${name} production build`);
}
