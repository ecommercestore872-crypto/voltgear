import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { acceptedMetaPurchase, metaStorefrontPath } from "./meta-commerce";
import { buildMetaServerPurchasePayload } from "./meta-events-api";
import { metaClientIp } from "./meta-ip";
import { buildMetaHashedCustomer, metaHash, normalizeMetaPhone } from "./meta-matching";
import { knownMetaCustomer, rememberMetaCustomer, trackAcceptedMetaPurchase } from "./meta-pixel-events";
import { captureMetaClick } from "./meta-click-attribution";

const here = import.meta.dirname;
const root = join(here, "../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const ORDER = { ok: true, isDemo: false, orderId: "BNT-ONCE-1", total: 3500,
  lines: [{ slug: "buds", name: "Buds", price: 3000, quantity: 1 }] };

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const env = { ...process.env };
afterEach(() => {
  for (const [k, d] of [["window", originalWindow], ["document", originalDocument]] as const) {
    if (d) Object.defineProperty(globalThis, k, d); else Reflect.deleteProperty(globalThis, k);
  }
  for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
  Object.assign(process.env, env);
});

/** A browser whose storage survives "reloads" (new window object, same store). */
function browser(store: Map<string, string>, pathname: string) {
  const calls: any[][] = [];
  const win: any = {
    fbq: (...args: any[]) => calls.push(args), __META_PIXEL_BOOTSTRAPPED__: true,
    location: { pathname, search: "", hash: "", hostname: "buyntryy.com", origin: "https://buyntryy.com" },
    navigator: { locks: { request: async (_n: string, _o: unknown, cb: () => void) => cb() } },
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } },
    sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  return calls;
}
function prodEnv() {
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "1707417188053568";
  process.env.NODE_ENV = "production";
  delete process.env.NEXT_PUBLIC_META_TEST_MODE;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
  delete process.env.NEXT_PUBLIC_VERCEL_ENV;
}

test("browser eventID, server event_id and the saved queue row all equal the order number", async () => {
  prodEnv();
  const store = new Map([["bnt-cookie-consent", "all"]]);
  const calls = browser(store, "/checkout");
  await trackAcceptedMetaPurchase(200, ORDER, { phone: "03001234567" });
  const purchase = calls.find((c) => c[2] === "Purchase")!;
  assert.equal(purchase[4].eventID, ORDER.orderId);
  const accepted = acceptedMetaPurchase(200, ORDER)!;
  const server = buildMetaServerPurchasePayload({ ...accepted, phone: "03001234567" })!;
  assert.equal(server.data[0].event_id, ORDER.orderId);
  assert.equal(server.data[0].event_name, "Purchase");
  // The database refuses any queue row whose event_id is not the order number.
  assert.match(read("supabase/migrations/20261112062940_meta_purchase_matching_fields.sql"), /event_id' <> p_order_id/);
});

test("reloading or revisiting the checkout or order page never fires Purchase a second time", async () => {
  prodEnv();
  const store = new Map([["bnt-cookie-consent", "all"]]);
  let calls = browser(store, "/checkout");
  await trackAcceptedMetaPurchase(200, ORDER);
  await trackAcceptedMetaPurchase(200, { ...ORDER, replayed: true });
  assert.equal(calls.filter((c) => c[2] === "Purchase").length, 1);
  // "Reload": brand-new window, same browser storage.
  calls = browser(store, "/checkout");
  await trackAcceptedMetaPurchase(200, ORDER);
  assert.equal(calls.filter((c) => c[2] === "Purchase").length, 0);
  // Visiting the thank-you / order page: the pixel is switched off there.
  assert.equal(metaStorefrontPath("/order/BNT-ONCE-1"), false);
  calls = browser(new Map([["bnt-cookie-consent", "all"]]), "/order/BNT-ONCE-1");
  await trackAcceptedMetaPurchase(200, { ...ORDER, orderId: "BNT-ONCE-2" });
  assert.equal(calls.filter((c) => c[2] === "Purchase").length, 0);
  // Another order is still counted.
  calls = browser(store, "/checkout");
  await trackAcceptedMetaPurchase(200, { ...ORDER, orderId: "BNT-ONCE-3" });
  assert.equal(calls.filter((c) => c[2] === "Purchase").length, 1);
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".next" ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

test("only one browser place and one server place can send Purchase", () => {
  const files = [...sourceFiles(join(root, "packages/shared")), ...sourceFiles(join(root, "apps/storefront/app"))];
  const graph = files.filter((f) => readFileSync(f, "utf8").includes("}/events`")).map((f) => f.slice(root.length + 1)).sort();
  assert.deepEqual(graph, ["packages/shared/lib/meta-events-api.ts", "packages/shared/lib/meta-purchase-outbox.ts"]);
  const api = read("packages/shared/lib/meta-events-api.ts");
  // The only network call in this file is the pre-purchase sender, whose event type cannot be Purchase.
  assert.equal(api.match(/\bfetch\(/g)?.length, 1);
  assert.match(api, /eventName: Exclude<MetaEventName, "Purchase">/);
  const browserCallers = files.filter((f) => /trackAcceptedMetaPurchase|trackMetaPurchase\(/.test(readFileSync(f, "utf8")) && !f.endsWith("meta-pixel-events.ts"));
  assert.deepEqual(browserCallers.map((f) => f.slice(root.length + 1)), ["packages/shared/components/checkout/checkout-page-client.tsx"]);
  assert.doesNotMatch(read("apps/storefront/app/order/[id]/page.tsx"), /fbq|trackMeta|meta-pixel/);
});

test("server Purchase is sent right after the order is saved; the 30-minute job is only a retry", () => {
  const tracking = read("packages/shared/lib/checkout-post-persist-tracking.ts");
  assert.ok(tracking.indexOf("processMetaPurchaseOutboxForOrder(input.orderId)") < tracking.indexOf("attachOrderAttribution("));
  assert.match(read("apps/storefront/vercel.json"), /meta-purchase-outbox[\s\S]{0,60}\*\/30 \* \* \* \*/);
  assert.match(read("supabase/migrations/20261106020000_meta_purchase_outbox.sql"), /order_id text not null unique/);
});

test("Pakistani phones become 92 + number, digits only, before hashing", () => {
  for (const raw of ["03001234567", "0300 1234567", "+923001234567", "+92 300 1234567", "923001234567", "00923001234567", "+92 0300 1234567", "3001234567"]) {
    assert.equal(normalizeMetaPhone(raw), "923001234567", raw);
  }
  assert.equal(buildMetaHashedCustomer({ phone: "+92 0300-1234567" }).ph, sha("923001234567"));
});

test("Purchase sends hashed fn, ln, ct, country and each value is hashed only once", () => {
  const customer = { phone: "03001234567", fullName: "Ali Raza Khan", city: "Lahore", country: "pk", email: "Ali@Example.com" };
  const once = buildMetaHashedCustomer(customer);
  assert.equal(once.fn, sha("ali"));
  assert.equal(once.ln, sha("raza khan"));
  assert.equal(once.ct, sha("lahore"));
  assert.equal(once.country, sha("pk"));
  const body = buildMetaServerPurchasePayload({ orderId: "BNT-9", value: 100, items: [{ productId: "buds", price: 100, quantity: 1 }],
    ...customer, externalId: "abcdef0123456789abcd", clientIp: "2001:db8::1", userAgent: "UA" })!;
  const u = body.data[0].user_data;
  assert.deepEqual([u.fn, u.ln, u.ct, u.country], [[sha("ali")], [sha("raza khan")], [sha("lahore")], [sha("pk")]]);
  assert.deepEqual(u.external_id, [sha("abcdef0123456789abcd")]);
  assert.equal(u.client_ip_address, "2001:db8::1", "IP is sent as-is, never hashed");
  // Feeding already-hashed values back in must not hash them a second time.
  const again = buildMetaHashedCustomer({ fullName: "ali", city: "lahore", country: "pk" });
  assert.equal(buildMetaHashedCustomer({ city: metaHash("lahore") }).ct, undefined);
  assert.equal(again.ct, sha("lahore"));
});

test("client IP: first valid forwarded address, IPv6 preferred, ports stripped, never invented", () => {
  const ip = (h: Record<string, string>) => metaClientIp(new Headers(h));
  assert.equal(ip({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), "203.0.113.7");
  assert.equal(ip({ "x-forwarded-for": "unknown, 203.0.113.7:5544" }), "203.0.113.7");
  assert.equal(ip({ "x-forwarded-for": "203.0.113.7, 2001:db8::5" }), "2001:db8::5");
  assert.equal(ip({ "x-forwarded-for": "[2001:db8::9]:443" }), "2001:db8::9");
  assert.equal(ip({ "x-real-ip": "198.51.100.4" }), "198.51.100.4");
  assert.equal(ip({ "x-forwarded-for": "unknown, not-an-ip" }), undefined);
});

test("fbc is fb.1.<milliseconds>.<fbclid> with the click ID case preserved", () => {
  prodEnv();
  const jar: string[] = [];
  const store = new Map([["bnt-cookie-consent", "all"]]);
  browser(store, "/");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { set cookie(v: string) { jar.push(v); }, get cookie() { return ""; } } });
  captureMetaClick("/?fbclid=AbCdEf_123-xYz");
  const fbc = jar.find((c) => c.startsWith("_fbc="))!.split(";")[0].slice(5);
  assert.match(fbc, /^fb\.1\.\d{13}\.AbCdEf_123-xYz$/);
});

test("typed email and phone are remembered as hashes and merged, never overwritten", () => {
  prodEnv();
  const store = new Map([["bnt-cookie-consent", "all"]]);
  browser(store, "/checkout");
  rememberMetaCustomer({ email: "Buyer@Example.com" });
  rememberMetaCustomer({ phone: "03001234567" });
  rememberMetaCustomer({ phone: "" });
  assert.deepEqual(knownMetaCustomer(), { em: sha("buyer@example.com"), ph: sha("923001234567") });
  assert.doesNotMatch(store.get("bnt-meta-match")!, /buyer@|0300/);
  store.set("bnt-cookie-consent", "essential");
  rememberMetaCustomer({ email: "other@example.com" });
  assert.equal(knownMetaCustomer().em, sha("buyer@example.com"), "no storing without advertising consent");
});
