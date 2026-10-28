import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { root, stagingDirectory } from './runtime.mjs';
import { isolatedProcessEnvironment } from './isolation.mjs';

const directory = join(stagingDirectory, `release-prep-gates-${randomUUID()}`); await mkdir(directory);
const report = { startedAt: new Date().toISOString(), applicationBuildsPreserved: {}, results: [],
  scope: 'Local source/contracts/lint/type/budgets. No application rebuild, database apply or rollback certification.' };
for (const name of ['admin', 'storefront']) report.applicationBuildsPreserved[name] =
  (await readFile(join(root, 'apps', name, '.next/BUILD_ID'), 'utf8')).trim();
const steps = [
  ['unit', [join(root, 'scripts/run-unit-tests.mjs')]],
  ['streaming', ['--import', 'tsx', '--test', 'scripts/check-admin-streaming-compatibility.test.mjs']],
  ['migration-plan', ['--test', 'scripts/local-staging/release-migration-plan.test.mjs']],
  ['harness', ['--test', ...['isolation', 'browser-https', 'browser-pki', 'browser-https-recover', 'browser-debug-cleanup'].map((name) => `scripts/local-staging/${name}.test.mjs`)]],
  ['lint-storefront', ['node_modules/next/dist/bin/next', 'lint', 'apps/storefront']],
  ['lint-admin', ['node_modules/next/dist/bin/next', 'lint', 'apps/admin']],
  ['type-storefront', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false', '-p', 'apps/storefront/tsconfig.json']],
  ['type-admin', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false', '-p', 'apps/admin/tsconfig.json']],
  ['budgets', ['scripts/check-storefront-performance-budget.mjs']],
];
for (const [step, args] of steps) {
  let output = '';
  const child = spawn(process.execPath, args, { cwd: root,
    env: { ...isolatedProcessEnvironment(), NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk; });
  const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  await writeFile(join(directory, `${step}.log`), output);
  const result = { step, exitCode, finishedAt: new Date().toISOString() };
  report.results.push(result); await writeFile(join(directory, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...result, directory, summary: output.split(/\r?\n/).filter((line) => /^(?:ℹ|#) (?:tests|suites|pass|fail)|error TS|Error:|Failed|PASS/.test(line)).slice(-8) }));
  if (exitCode !== 0) { process.exitCode = 1; break; }
}
report.passed = report.results.length === steps.length && report.results.every(({ exitCode }) => exitCode === 0);
for (const [name, build] of Object.entries(report.applicationBuildsPreserved)) {
  if ((await readFile(join(root, 'apps', name, '.next/BUILD_ID'), 'utf8')).trim() !== build) report.passed = false;
}
report.finishedAt = new Date().toISOString(); await writeFile(join(directory, 'results.json'), JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
