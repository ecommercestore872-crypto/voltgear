import assert from 'node:assert/strict';

export const productionRef = 'zeuhfqevqjkbzwdaxjuv';
export const projectId = 'buyntry-isolated-acceptance';

/** Exact endpoints only: no hosted URLs, credentials, redirects or arbitrary ports. */
export function requireLocalEndpoint(value, port) {
  assert.equal(typeof value, 'string', 'Endpoint required');
  assert.ok(!value.toLowerCase().includes(productionRef), 'Production project is forbidden');
  assert.ok(value === `http://127.0.0.1:${port}`, 'Only the dedicated loopback endpoint is permitted');
  return value;
}

/** Do not inherit application/provider secrets or CLI remote-target overrides. */
export function isolatedProcessEnvironment(source = process.env) {
  const allowed = /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|PROGRAMFILES|PROGRAMFILES\(X86\)|PROGRAMDATA|COMSPEC|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i;
  const result = Object.fromEntries(Object.entries(source).filter(([key]) => allowed.test(key)));
  result.SUPABASE_TELEMETRY_DISABLED = 'true';
  return result;
}

export function requireOwnedLocalDocker(context) {
  assert.equal(context?.Endpoints?.docker?.Host, 'npipe:////./pipe/dockerDesktopLinuxEngine', 'Exact local Docker Desktop engine pipe required');
}

export function requireMigrationInventory(source, staged, manifest) {
  const ordered = (values) => [...values].sort();
  assert.ok(source.length > 0, 'Empty migration history forbidden');
  for (const list of [source, staged, manifest]) {
    assert.equal(new Set(list).size, list.length, 'Duplicate filenames');
    assert.equal(new Set(list.map((name) => name.split('_')[0])).size, list.length, 'Duplicate versions');
    for (const name of list) assert.match(name, /^\d+_[a-zA-Z0-9_]+\.sql$/);
    assert.deepEqual(ordered(list), ordered(source), 'Migration inventories differ');
  }
}

/** Expose actionable CLI failure lines, never credential/status output. */
export function safeStartupDiagnostics(value) {
  // Image registries put short-lived download credentials in signed URLs.
  // Strip every URL query/fragment before selecting diagnostic lines.
  const scrubbed = String(value ?? '').replace(/https?:\/\/[^\s"']+/g, (value) => {
    try { const url = new URL(value); return `${url.protocol}//${url.host}${url.pathname}`; }
    catch { return '[URL redacted]'; }
  });
  return scrubbed.split(/\r?\n/)
    .filter((line) => /error|failed|invalid|applying migration|sqlstate|unrecognized|unsupported|timed out/i.test(line) || /^\s+at .+:\d+:\d+\)?\s*$/.test(line))
    .filter((line) => !/password|secret|token|authorization|bearer|api.?key|jwt|sb_[a-z]|eyJ[A-Za-z0-9_-]+\./i.test(line))
    .slice(-12).map((line) => line.replace(/[\u001b\u009b][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*)?\u0007|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g, '').slice(0, 400)).join('\n');
}

export function requireSafeCliCache(entries) {
  for (const [name, value] of entries) {
    assert.equal(name, 'cli-latest', 'Linked/unknown CLI metadata forbidden');
    assert.match(value.trim(), /^v?\d+\.\d+\.\d+$/, 'Only CLI version metadata permitted');
  }
}
