import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const repository = new URL('../', import.meta.url);
export function assertAdminStylesheetScope(entries) {
  const imports = [];
  for (const { path, source } of entries) {
    const css = source.match(/["'][^"'\r\n]+\.css(?:\?[^"'\r\n]*)?["']/g) ?? [];
    if (css.length) {
      assert.equal(path, 'apps/admin/app/layout.tsx', `New stylesheet location needs streaming review: ${path}`);
      imports.push(...css);
    }
    assert.doesNotMatch(source, /\brel\s*[:=]\s*["']stylesheet["']|\bprecedence\s*[:=]/,
      `New stylesheet resource needs streaming review: ${path}`);
  }
  return imports;
}
async function inspectStylesheetScope() {
  const entries = [];
  async function walk(directory) {
    for (const entry of await readdir(new URL(directory + '/', repository), { withFileTypes: true })) {
      if (['.next', 'node_modules', '.git', 'public'].includes(entry.name)) continue;
      const path = directory + '/' + entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:ts|tsx|js|mjs)$/.test(path) && !/\.test\.[^.]+$/.test(path))
        entries.push({ path, source: await readFile(new URL(path, repository), 'utf8') });
    }
  }
  for (const directory of ['apps/admin', 'packages/shared']) await walk(directory);
  return assertAdminStylesheetScope(entries);
}
export const expectedStreamingContract = Object.freeze({
  next: '15.5.28', react: '19.2.0-canary-0bdb9206-20250818',
  browser: '37c4eb9c33da93fe418f93c70668f40ce68fb33c9a44221924284c265d543c6b',
  edge: '7d1649cbc04d3c6b8007592fe97692eb0e3685d20c7a1ef4ba126b233fb660e9',
});

// Entire installed server artifacts are pinned as well as package versions.
// An update needs independent protocol review and production-browser evidence;
// never regenerate hashes merely to make CI pass.
export async function inspectStreamingContract(expected = expectedStreamingContract) {
  assert.equal(require('next/package.json').version, expected.next, 'Next streaming contract needs review');
  assert.equal(require('next/dist/compiled/react').version, expected.react, 'Vendored React needs review');
  await inspectStylesheetScope();
  const protocols = [];
  for (const kind of ['browser', 'edge']) {
    const file = require.resolve(`next/dist/compiled/react-dom/cjs/react-dom-server.${kind}.production.js`);
    const bytes = await readFile(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected[kind], `${kind} Fizz artifact changed`);
    const literals = [...bytes.toString('utf8').matchAll(/stringToPrecomputedChunk\(\s*('(?:\\.|[^'\\])*')\s*\)/g)]
      .map((match) => vm.runInNewContext(match[1], Object.create(null), { timeout: 1000 }));
    const reveal = literals.filter((value) => value.startsWith('$RB=[];$RV=function'));
    const styles = literals.filter((value) => value.startsWith('$RM=new Map;$RR=function'));
    assert.equal(reveal.length, 1, 'Unknown reveal bootstrap');
    assert.equal(styles.length, 1, 'Unknown stylesheet bootstrap');
    assert.ok(styles[0].endsWith(';$RR("'), 'Unknown stylesheet invocation format');
    protocols.push({ kind, reveal: reveal[0], styles: styles[0].slice(0, -6) });
  }
  return protocols;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const protocols = await inspectStreamingContract();
  console.log(JSON.stringify({ passed: true, next: expectedStreamingContract.next,
    vendoredReact: expectedStreamingContract.react, runtimes: protocols.map(({ kind }) => kind),
    limitation: 'Artifact compatibility only; behavioral tests and immutable-build browser regression remain required.' }));
}
