import assert from "node:assert/strict";
import { legacyConsentPolicy } from "./test-support/consent-required";
import { createHash } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import { buildMetaServerEventPayload, buildMetaServerPurchasePayload, trackMetaServerEvent } from "./meta-events-api";
import { readMetaCookieIds } from "./checkout-tracking-rules";
import { parseBrowserMetaEvent, browserMetaCustomData } from "./meta-event-rules";
import { metaPixelHeadScript } from "./meta-pixel-head-script";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const FBP = "fb.1.1700000000000.1234567890";
const FBC = "fb.1.1700000000000.AbCdEf";

test("server copy of every pre-purchase event carries browser event_id and all matching signals", () => {
  for (const eventName of ["PageView", "ViewContent", "AddToCart", "InitiateCheckout"] as const) {
    const body = buildMetaServerEventPayload({
      eventName, eventId: "evt-1234567890", pageUrl: "https://buyntryy.com/product/buds",
      customData: eventName === "PageView" ? undefined : { currency: "PKR", value: 100 },
      clientIp: "203.0.113.9", userAgent: "UA/1.0", fbp: FBP, fbc: FBC, externalId: "abcdef0123456789abcd",
      emHash: sha("a@b.com"), phHash: sha("923001234567"),
    })!;
    const e = body.data[0];
    assert.equal(e.event_name, eventName);
    assert.equal(e.event_id, "evt-1234567890");
    assert.deepEqual(e.user_data.external_id, [sha("abcdef0123456789abcd")]);
    assert.deepEqual(e.user_data.em, [sha("a@b.com")]);
    assert.deepEqual(e.user_data.ph, [sha("923001234567")]);
    assert.equal(e.user_data.client_ip_address, "203.0.113.9");
    assert.equal(e.user_data.client_user_agent, "UA/1.0");
    assert.equal(e.user_data.fbp, FBP);
    assert.equal(e.user_data.fbc, FBC);
  }
});

test("server copy rejects bad event ids, plain-text PII and empty identity", () => {
  const base = { eventName: "PageView" as const, pageUrl: "https://buyntryy.com/" };
  assert.equal(buildMetaServerEventPayload({ ...base, eventId: "short", fbp: FBP }), null);
  assert.equal(buildMetaServerEventPayload({ ...base, eventId: "evt-1234567890" }), null);
  const body = buildMetaServerEventPayload({ ...base, eventId: "evt-1234567890", fbp: FBP, emHash: "me@example.com" })!;
  assert.equal(body.data[0].user_data.em, undefined, "raw email must never be forwarded");
});

test("Purchase server event now also sends external_id with the same event_id as the browser", () => {
  const body = buildMetaServerPurchasePayload({
    orderId: "BNT-1", value: 100, items: [{ productId: "buds", price: 100, quantity: 1 }],
    phone: "03001234567", externalId: "abcdef0123456789abcd", clientIp: "203.0.113.9", userAgent: "UA", fbp: FBP,
  })!;
  assert.equal(body.data[0].event_id, "BNT-1");
  assert.deepEqual(body.data[0].user_data.external_id, [sha("abcdef0123456789abcd")]);
  assert.deepEqual(body.data[0].user_data.ph, [sha("923001234567")]);
});

test("cookie reader exposes fbp, fbc and the first-party external id", () => {
  assert.deepEqual(readMetaCookieIds(`a=1; _fbp=${FBP}; bnt_xid=abcdef0123456789abcd`), { fbp: FBP, externalId: "abcdef0123456789abcd" });
  assert.deepEqual(readMetaCookieIds("bnt_xid=bad id"), {});
});

test("browser event parser keeps only valid hashes and still refuses Purchase", () => {
  const raw = { eventName: "AddToCart", eventId: "evt-1234567890", consent: "all", pageUrl: "https://buyntryy.com/p",
    productIds: ["buds"], value: 10, numItems: 1, em: sha("x@y.com"), ph: "not-a-hash" };
  const parsed = parseBrowserMetaEvent(raw, "https://buyntryy.com")!;
  assert.equal(parsed.em, sha("x@y.com"));
  assert.equal(parsed.ph, undefined);
  assert.deepEqual(browserMetaCustomData(parsed), { currency: "PKR", value: 10, content_ids: ["buds"], content_type: "product", num_items: 1 });
  assert.equal(parseBrowserMetaEvent({ ...raw, eventName: "Purchase" }, "https://buyntryy.com"), null);
});

test("server copy is skipped without consent or token and never hard-codes a token", async (t) => {
  legacyConsentPolicy(t);
  const before = { ...process.env };
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response('{"events_received":1}'); }) as typeof fetch;
  try {
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "999999999999999";
    process.env.NEXT_PUBLIC_META_TEST_MODE = "true";
    process.env.META_TEST_EVENT_CODE = "TEST1";
    process.env.VERCEL_ENV = "preview";
    const input = { eventName: "PageView" as const, eventId: "evt-1234567890", pageUrl: "https://buyntryy.com/", fbp: FBP, consent: "all" };
    delete process.env.META_CONVERSIONS_API_ACCESS_TOKEN;
    assert.equal(await trackMetaServerEvent(input), false);
    process.env.META_CONVERSIONS_API_ACCESS_TOKEN = "ENV-TOKEN";
    assert.equal(await trackMetaServerEvent({ ...input, consent: "essential" }), false);
    assert.equal(calls, 0);
    assert.equal(await trackMetaServerEvent(input), true);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in before)) delete process.env[k];
    Object.assign(process.env, before);
  }
});

function runHead(opts: { consent?: string; dnt?: string; path?: string; search?: string; host?: string }) {
  const posts: Array<{ url: string; body: any }> = [];
  const jar: string[] = [`_fbp=${FBP}`];
  const appended: any[] = [];
  const store = new Map<string, string>(opts.consent ? [["bnt-cookie-consent", opts.consent]] : []);
  const win: any = {
    localStorage: { getItem: (k: string) => store.get(k) ?? null },
    navigator: { doNotTrack: opts.dnt },
    location: { pathname: opts.path ?? "/", search: opts.search ?? "", hash: "", hostname: opts.host ?? "buyntryy.com", origin: `https://${opts.host ?? "buyntryy.com"}` },
    crypto: { randomUUID: () => "11111111-2222-3333-4444-555555555555" },
    setTimeout: (f: () => void) => { f(); return 0; },
    fetch: (url: string, init: any) => { posts.push({ url, body: JSON.parse(init.body) }); return Promise.resolve(); },
    Date, Math, JSON,
  };
  win.window = win;
  win.document = {
    get cookie() { return jar.join("; "); }, set cookie(v: string) { jar.push(v.split(";")[0]); },
    head: { appendChild: (el: any) => appended.push(el) }, createElement: () => ({}),
  };
  vm.runInNewContext(metaPixelHeadScript({ pixelId: "1707417188053568", testMode: false, requireConsent: process.env.NEXT_PUBLIC_TRACK_ALL_VISITORS === "false" }), win);
  return { win, posts, appended, jar };
}

test("head script fires PageView immediately with event_id shared with the server copy", () => {
  const { win, posts, appended, jar } = runHead({ consent: "all", search: "?fbclid=AbC123" });
  const pv = win.fbq.queue.find((a: any) => a[0] === "trackSingle");
  assert.equal(pv[2], "PageView");
  assert.equal(pv[4].eventID, "11111111-2222-3333-4444-555555555555");
  assert.equal(win.fbq.queue.find((a: any) => a[0] === "init")[2].external_id, "11111111222233334444555555555555");
  assert.equal(appended[0].src, "https://connect.facebook.net/en_US/fbevents.js");
  assert.equal(posts[0].url, "/api/meta/events");
  assert.equal(posts[0].body.eventId, pv[4].eventID);
  assert.ok(jar.some((c) => c.startsWith("_fbc=fb.1.") && c.endsWith(".AbC123")));
  assert.equal(win.__META_PIXEL_BOOTSTRAPPED__, true);
  assert.equal(win.__META_PIXEL_LAST_PATHNAME__, "/");
});

/** A fake browser where the test controls the clock, the load event, page hiding and the _fbp cookie. */
function runHeadLive(opts: { fbp?: boolean; readyState?: string; noListeners?: boolean } = {}) {
  const posts: Array<{ url: string; body: any }> = [];
  const jar: string[] = opts.fbp ? [`_fbp=${FBP}`] : [];
  const appended: any[] = [];
  const timers: Array<{ ms: number; f: () => void; done?: boolean }> = [];
  const winL: Record<string, Array<() => void>> = {};
  const docL: Record<string, Array<() => void>> = {};
  const doc: any = {
    readyState: opts.readyState ?? "loading", visibilityState: "visible",
    get cookie() { return jar.join("; "); }, set cookie(v: string) { jar.push(v.split(";")[0]); },
    head: { appendChild: (el: any) => appended.push(el) }, createElement: () => ({}),
  };
  const win: any = {
    localStorage: { getItem: () => null }, navigator: {},
    location: { pathname: "/product/buds", search: "?fbclid=AbC123", hash: "", hostname: "buyntryy.com", origin: "https://buyntryy.com" },
    crypto: { randomUUID: () => "11111111-2222-3333-4444-555555555555" },
    setTimeout: (f: () => void, ms: number) => { timers.push({ ms, f }); return timers.length; },
    fetch: (url: string, init: any) => { posts.push({ url, body: JSON.parse(init.body) }); return Promise.resolve(); },
    Date, Math, JSON,
  };
  if (!opts.noListeners) {
    win.addEventListener = (n: string, f: () => void) => { (winL[n] ||= []).push(f); };
    doc.addEventListener = (n: string, f: () => void) => { (docL[n] ||= []).push(f); };
  }
  win.window = win; win.document = doc;
  vm.runInNewContext(metaPixelHeadScript({ pixelId: "1707417188053568", testMode: false }), win);
  /** Run due timers up to `ms` virtual milliseconds, in order. */
  const advance = (ms: number) => {
    for (const t of [...timers].sort((a, b) => a.ms - b.ms)) if (!t.done && t.ms <= ms) { t.done = true; t.f(); }
  };
  return { win, doc, posts, appended, jar, winL, docL, advance };
}

test("head script queues PageView at once but loads fbevents.js only after the page load event", () => {
  const h = runHeadLive();
  assert.equal(h.win.fbq.queue.find((a: any) => a[0] === "trackSingle")[2], "PageView");
  assert.equal(h.appended.length, 0, "SDK must not be fetched during page load");
  assert.equal(h.posts.length, 0, "no _fbp yet: server copy waits for the SDK");
  h.winL.load.forEach((f) => f());
  h.advance(0);
  assert.equal(h.appended.length, 1);
  assert.equal(h.appended[0].src, "https://connect.facebook.net/en_US/fbevents.js");
});

test("head script still loads the SDK after 3 s if the load event never comes", () => {
  const h = runHeadLive();
  h.advance(2999);
  assert.equal(h.appended.length, 0);
  h.advance(3000);
  assert.equal(h.appended.length, 1);
});

test("server PageView goes out once the SDK has set _fbp, carrying the browser event id", () => {
  const h = runHeadLive();
  h.advance(3000);
  assert.equal(h.posts.length, 0);
  h.jar.push(`_fbp=${FBP}`);
  h.appended[0].onload();
  h.advance(10000);
  assert.equal(h.posts.length, 1);
  assert.equal(h.posts[0].url, "/api/meta/events");
  assert.equal(h.posts[0].body.eventName, "PageView");
  assert.equal(h.posts[0].body.eventId, h.win.fbq.queue.find((a: any) => a[0] === "trackSingle")[4].eventID);
});

test("a visitor who leaves or hides the page before the SDK loads is still counted, exactly once", () => {
  const h = runHeadLive();
  h.doc.visibilityState = "hidden";
  h.docL.visibilitychange.forEach((f) => f());
  h.winL.pagehide.forEach((f) => f());
  assert.equal(h.posts.length, 1);
  h.advance(10000);
  h.appended[0]?.onload?.();
  h.advance(20000);
  assert.equal(h.posts.length, 1, "never duplicated");
});

test("returning visitor with _fbp sends the server copy at once, like before", () => {
  const h = runHeadLive({ fbp: true });
  assert.equal(h.posts.length, 1);
  assert.equal(h.appended.length, 0);
});

test("if the SDK is blocked the server copy is still sent, and a late send never duplicates", () => {
  const h = runHeadLive();
  h.advance(3000);
  h.appended[0].onerror();
  assert.equal(h.posts.length, 1);
  h.advance(20000);
  assert.equal(h.posts.length, 1);
});

test("page already complete, or a browser without addEventListener: SDK loads immediately", () => {
  assert.equal(runHeadLive({ readyState: "complete" }).appended.length, 1);
  assert.equal(runHeadLive({ noListeners: true }).appended.length, 1);
});

test("head script runs with no banner answer, but not after an explicit reject, with privacy signals, or on excluded pages/hosts", (t) => {
  legacyConsentPolicy(t);
  const fresh = runHead({});
  assert.equal(fresh.win.fbq.queue.find((a: any) => a[0] === "trackSingle")[2], "PageView");
  assert.equal(fresh.posts[0].body.consent, null);
  for (const o of [{ consent: "essential" }, { consent: "analytics" }, { consent: "all", dnt: "1" },
    { consent: "all", path: "/order/BNT-1" }, { consent: "all", path: "/checkout", search: "?email=a@b.com" },
    { consent: "all", host: "preview.vercel.app" }]) {
    const { win, posts } = runHead(o);
    assert.equal(win.fbq, undefined, JSON.stringify(o));
    assert.equal(posts.length, 0);
  }
});

test("Meta needs no banner answer: unanswered runs; only an explicit reject or privacy signal stops it", async (t) => {
  legacyConsentPolicy(t);
  const { metaConsentAllows, canSendMetaServerEvent } = await import("./meta-consent");
  for (const stored of [null, undefined, "", "garbage", "all", "advertising"]) assert.equal(metaConsentAllows(stored), true, String(stored));
  for (const stored of ["essential", "analytics"]) assert.equal(metaConsentAllows(stored), false, stored);
  assert.equal(canSendMetaServerEvent(null, new Headers()), true);
  assert.equal(canSendMetaServerEvent(null, new Headers({ "sec-gpc": "1" })), false);
  assert.equal(canSendMetaServerEvent("essential", new Headers()), false);
  const ev = { eventName: "PageView", eventId: "evt-1234567890", pageUrl: "https://buyntryy.com/" };
  assert.equal(parseBrowserMetaEvent({ ...ev, consent: null }, "https://buyntryy.com")?.consent, null);
  assert.equal(parseBrowserMetaEvent({ ...ev }, "https://buyntryy.com")?.eventName, "PageView");
  assert.equal(parseBrowserMetaEvent({ ...ev, consent: "essential" }, "https://buyntryy.com"), null);
  assert.equal(parseBrowserMetaEvent({ ...ev, consent: "bogus" }, "https://buyntryy.com"), null);
});
