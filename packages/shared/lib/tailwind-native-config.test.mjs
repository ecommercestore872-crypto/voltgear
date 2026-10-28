import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

for (const file of ['../../../tailwind.config.ts', '../../../apps/storefront/tailwind.config.ts', '../../../apps/admin/tailwind.config.ts']) {
  test(`Tailwind config imports natively under the pinned Node24 runtime: ${file}`, () => {
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    const target = new URL(file, import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      'const {default:config}=await import(process.argv[1]); if(config.plugins.length!==1 || !config.plugins[0] || !config.content.length) process.exit(1);', target],
    { encoding: 'utf8', env, timeout: 15_000 });
    assert.equal(result.status, 0, result.stderr);
  });
}
