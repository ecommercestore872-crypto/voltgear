import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { inspectStreamingContract, expectedStreamingContract, assertAdminStylesheetScope } from './check-admin-streaming-compatibility.mjs';
import { adminDocumentReady } from '../packages/shared/lib/admin-document-ready.ts';

const protocols = await inspectStreamingContract();
test('new nested/dynamic CSS or explicit stylesheet resources require streaming review', () => {
  assert.equal(assertAdminStylesheetScope([{ path: 'apps/admin/app/layout.tsx', source: 'import "./globals.css";' }]).length, 1);
  for (const source of ['import("./lazy.css")', '<link rel="stylesheet" href="/lazy" />', '<link precedence="default" />']) {
    assert.throws(() => assertAdminStylesheetScope([{ path: 'packages/shared/components/lazy.tsx', source }]));
  }
});
function harness(protocol) {
  const frames = [], timers = [], nodes = new Map();
  const parent = { removeChild(node) { node.parentNode = null; },
    insertBefore(node) { node.parentNode = this; segment.firstChild = null; } };
  const marker = { nodeType: 8, data: '$?', _reactRetry: () => { marker.retried = true; } };
  const end = { nodeType: 8, data: '/$', parentNode: parent, nextSibling: null };
  const template = { nodeType: 1, previousSibling: marker, parentNode: parent, nextSibling: end };
  const child = { nodeType: 1 };
  const segment = { parentNode: parent, firstChild: child };
  nodes.set('boundary', template); nodes.set('segment', segment);
  const listeners = new Map();
  const document = { readyState: 'loading', getElementById: (id) => nodes.get(id),
    addEventListener: (name, callback) => listeners.set(name, callback), querySelectorAll: () => [] };
  const context = vm.createContext({ document, performance: { now: () => 100 },
    requestAnimationFrame: (callback) => frames.push(callback), setTimeout: (callback) => timers.push(callback),
    Map, Promise, matchMedia: () => ({ matches: true }), $RX: () => {} });
  vm.runInContext(protocol.reveal, context, { timeout: 1000 });
  return { context, document, frames, timers, marker, segment, parent, nodes,
    parsed() { document.readyState = 'interactive'; listeners.get('DOMContentLoaded')?.(); },
    flush(list) { const callbacks = list.splice(0); callbacks.forEach((callback) => callback()); } };
}

test('unknown dependency version or same-version changed Fizz artifact fails closed', async () => {
  await assert.rejects(inspectStreamingContract({ ...expectedStreamingContract, next: 'unreviewed' }));
  await assert.rejects(inspectStreamingContract({ ...expectedStreamingContract, browser: '0'.repeat(64) }));
});
for (const protocol of protocols) {
  test(`${protocol.kind}: actual reveal remains queued until frame commit; helper preserves DOM ordering`, async () => {
    const h = harness(protocol);
    const pending = () => Array.isArray(h.context.$RB) && h.context.$RB.length > 0;
    const promise = adminDocumentReady(h.document, pending, (callback) => h.frames.push(callback));
    assert.equal(adminDocumentReady(h.document, pending), promise);
    let resolved = false; promise.then(() => { resolved = true; });
    h.context.$RC('boundary', 'segment');
    assert.equal(h.marker.data, '$~'); assert.equal(h.context.$RB.length, 2);
    h.parsed(); await Promise.resolve(); assert.equal(resolved, false);
    // A suspended/background frame does not release the helper by a timer.
    for (let i = 0; i < 5; i++) await Promise.resolve();
    assert.equal(resolved, false); assert.equal(h.marker.data, '$~');
    h.flush(h.frames); await promise;
    assert.equal(h.context.$RB.length, 0); assert.equal(h.marker.data, '$');
    assert.equal(resolved, true); assert.equal(adminDocumentReady(h.document, pending), null);
  });
  test(`${protocol.kind}: actual delayed reveal uses timeout after earlier commit`, async () => {
    const h = harness(protocol); h.context.$RT = 100;
    h.context.$RC('boundary', 'segment'); h.document.readyState = 'complete';
    const promise = adminDocumentReady(h.document, () => h.context.$RB.length > 0, (cb) => h.frames.push(cb));
    assert.ok(promise); assert.equal(h.timers.length, 1); assert.equal(h.marker.data, '$~');
    h.flush(h.frames); assert.equal(h.marker.data, '$~');
    h.flush(h.timers); h.flush(h.frames); await promise;
    assert.equal(h.marker.data, '$');
  });
  test(`${protocol.kind}: missing segment is ignored, not queued`, () => {
    const h = harness(protocol); h.context.$RC('boundary', 'missing');
    assert.equal(h.context.$RB.length, 0); assert.equal(h.marker.data, '$?');
  });
  test(`${protocol.kind}: stylesheet-delayed reveal is NOT covered by queue-only readiness`, async () => {
    const h = harness(protocol); let finishStyle;
    const stylesheet = { tagName: 'LINK', dataset: { precedence: 'default' },
      getAttribute: (name) => name === 'href' ? '/synthetic.css' : null,
      _p: new Promise((resolve) => { finishStyle = resolve; }) };
    h.document.querySelectorAll = () => [stylesheet];
    vm.runInContext(protocol.styles, h.context, { timeout: 1000 });
    h.context.$RR('boundary', 'segment', [['/synthetic.css', 'default']]);
    assert.equal(h.marker.data, '$~'); assert.equal(h.context.$RB.length, 0);
    h.document.readyState = 'interactive';
    assert.equal(adminDocumentReady(h.document, () => h.context.$RB.length > 0), null);
    finishStyle(); await Promise.resolve(); await Promise.resolve();
    assert.equal(h.context.$RB.length, 2);
    h.flush(h.frames); assert.equal(h.marker.data, '$');
    // This intentionally records a protocol limitation, not browser acceptance.
  });
}
