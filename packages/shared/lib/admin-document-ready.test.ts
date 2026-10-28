import assert from "node:assert/strict";
import { test } from "node:test";
import { adminDocumentReady } from "./admin-document-ready";

class StreamingDocument extends EventTarget {
  readyState: DocumentReadyState = "loading";
}

test("server and already parsed documents never suspend or await window load", () => {
  assert.equal(adminDocumentReady(undefined), null);
  for (const state of ["interactive", "complete"] as const) {
    const document = new StreamingDocument(); document.readyState = state;
    assert.equal(adminDocumentReady(document), null);
  }
});

test("concurrent retries share one pending promise until parsing completes", async () => {
  const document = new StreamingDocument();
  const pending = adminDocumentReady(document); assert.ok(pending);
  assert.equal(adminDocumentReady(document), pending);
  let settled = false; void pending.then(() => { settled = true; });
  await Promise.resolve(); assert.equal(settled, false);
  document.readyState = "interactive"; document.dispatchEvent(new Event("DOMContentLoaded"));
  await pending; assert.equal(settled, true);
  assert.equal(adminDocumentReady(document), null);
  const other = new StreamingDocument(); assert.notEqual(adminDocumentReady(other), pending);
  other.readyState = "complete"; other.dispatchEvent(new Event("DOMContentLoaded"));
});

test("parsing completion during listener registration cannot leave hydration stuck", async () => {
  const document = new StreamingDocument();
  document.addEventListener = () => { document.readyState = "interactive"; };
  const pending = adminDocumentReady(document); assert.ok(pending);
  await pending;
  assert.equal(adminDocumentReady(document), null);
});

test("parsed documents still wait for queued server reveal commits", async () => {
  const document = new StreamingDocument(); document.readyState = "interactive";
  let queued = true; const frames: (() => void)[] = [];
  const pending = adminDocumentReady(document, () => queued, (callback) => { frames.push(callback); });
  assert.ok(pending); assert.equal(adminDocumentReady(document), pending);
  let settled = false; void pending.then(() => { settled = true; });
  frames.shift()!(); await Promise.resolve(); assert.equal(settled, false);
  queued = false; frames.shift()!(); await pending;
  assert.equal(settled, true); assert.equal(adminDocumentReady(document), null);
});

test("DOMContentLoaded cannot release hydration while reveal commits remain queued", async () => {
  const document = new StreamingDocument(); let queued = true; const frames: (() => void)[] = [];
  const pending = adminDocumentReady(document, () => queued, (callback) => { frames.push(callback); });
  assert.ok(pending); assert.equal(frames.length, 0);
  document.readyState = "complete"; document.dispatchEvent(new Event("DOMContentLoaded"));
  let settled = false; void pending.then(() => { settled = true; });
  await Promise.resolve(); assert.equal(settled, false);
  queued = false; frames.shift()!(); await pending; assert.equal(settled, true);
});
