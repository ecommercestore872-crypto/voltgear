import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { runInNewContext } from "node:vm";
import { syncTikTokPixel } from "./tiktok-pixel-runtime";

describe("TikTok Pixel runtime", () => {
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const env = { ...process.env };
let consent: string | null;
let nodes: Map<string, ElementStub>;
let timers: Array<() => void>;
let state: { ttq?: Array<unknown> };

class ElementStub {
  id = "";
  src = "";
  textContent = "";
  async = false;
  dataset: Record<string, string> = {};
  listeners: Record<string, () => void> = {};
  addEventListener(name: string, callback: () => void) { this.listeners[name] = callback; }
  remove() { nodes.delete(this.id); }
}

beforeEach(() => {
  consent = "all";
  nodes = new Map();
  timers = [];
  state = {};
  process.env.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "true";
  const doc = {
    readyState: "complete",
    getElementById: (id: string) => nodes.get(id) ?? null,
    createElement: () => new ElementStub(),
    head: { appendChild: (node: ElementStub) => {
      nodes.set(node.id, node);
      if (node.textContent) runInNewContext(node.textContent, { window: state, document: doc });
    } },
  };
  Object.assign(state, {
    location: { hostname: "buyntryy.com", pathname: "/" },
    localStorage: { getItem: () => consent },
    setTimeout: (callback: () => void) => { timers.push(callback); return timers.length; },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, writable: true, value: state });
  Object.defineProperty(globalThis, "document", { configurable: true, writable: true, value: doc });
});

afterEach(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
  for (const key of ["NODE_ENV", "NEXT_PUBLIC_TIKTOK_PIXEL_ID", "NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED"]) {
    if (env[key] === undefined) delete process.env[key]; else process.env[key] = env[key];
  }
});

const pages = () => state.ttq?.filter((entry) => Array.isArray(entry) && entry[0] === "page").length ?? 0;

for (const readyState of ["loading", "complete"]) {
  test(`consent before mount initializes at document ${readyState} without waiting for window.load`, () => {
    Object.assign(document, { readyState });
    syncTikTokPixel();
    assert.ok(state.ttq);
    assert.equal(nodes.size, 2);
    assert.equal(pages(), 1);
    syncTikTokPixel();
    assert.equal(nodes.size, 2);
    assert.equal(pages(), 1);
  });
}

test("late consent, navigation, withdrawal and regrant count each active page once", () => {
  consent = "essential";
  syncTikTokPixel();
  assert.equal(nodes.size, 0);
  consent = "all";
  syncTikTokPixel();
  Object.assign(window.location, { pathname: "/products" });
  syncTikTokPixel();
  syncTikTokPixel();
  assert.equal(pages(), 2);
  consent = "essential";
  syncTikTokPixel();
  assert.equal(pages(), 2);
  assert.equal((state.ttq!.at(-1) as string[])[0], "revokeConsent");
  consent = "all";
  syncTikTokPixel();
  syncTikTokPixel();
  assert.equal(pages(), 3);
});

for (const choice of [null, "essential"]) {
  test(`does not initialize for consent ${choice}`, () => {
    consent = choice;
    syncTikTokPixel();
    assert.equal(nodes.size, 0);
    assert.equal(state.ttq, undefined);
  });
}

test("storage failure fails closed", () => {
  window.localStorage.getItem = () => { throw new Error("blocked"); };
  syncTikTokPixel();
  assert.equal(nodes.size, 0);
});

test("missing ID, missing enabled flag and disabled configuration do not bootstrap", () => {
  delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  syncTikTokPixel();
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID = "PIXEL";
  delete process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED;
  syncTikTokPixel();
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED = "false";
  syncTikTokPixel();
  assert.equal(nodes.size, 0);
});

test("SDK errors retry twice with the same queue and no duplicate PageView", () => {
  syncTikTokPixel();
  const queue = state.ttq;
  for (let attempt = 0; attempt < 3; attempt++) {
    nodes.get("tiktok-pixel-sdk")!.listeners.error();
    timers.shift()?.();
  }
  assert.equal(state.ttq, queue);
  assert.equal(pages(), 1);
  assert.equal(timers.length, 0);
  assert.equal(nodes.size, 2);
});

test("withdrawing consent cancels a pending SDK retry", () => {
  syncTikTokPixel();
  const sdk = nodes.get("tiktok-pixel-sdk");
  sdk!.listeners.error();
  consent = "essential";
  syncTikTokPixel();
  timers.shift()?.();
  assert.equal(nodes.get("tiktok-pixel-sdk"), sdk);
  consent = "all";
  syncTikTokPixel();
  timers.shift()?.();
  assert.notEqual(nodes.get("tiktok-pixel-sdk"), sdk);
});
});
