/** Actual storefront browser gate. Every analytics request and order is mocked. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, devices } from "playwright";

const local = process.env.META_QA_LOCAL || "http://127.0.0.1:4590";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(local).hostname));
const origin = "https://buyntryy.test";
const pixel = "999999999999999";
const output = "tmp/meta-browser";
fs.mkdirSync(output, { recursive: true });
const sdk = `(() => {
  const q = window.fbq, pending = q.queue.slice(); let granted = true;
  window.__metaEvents = []; window.__metaInitializations = [];
  q.callMethod = function(command, ...args) {
    if (command === 'consent') { granted = args[0] === 'grant'; return; }
    if (command === 'init') { window.__metaInitializations.push(args[0]); return; }
    if (!granted || !['track','trackSingle'].includes(command)) return;
    const [event, properties = {}, options = {}] = command === 'trackSingle' ? args.slice(1) : args;
    const entry = { event, properties, eventID: options.eventID };
    window.__metaEvents.push(entry);
    fetch('https://www.facebook.com/tr/', { method:'POST', body:JSON.stringify(entry) });
  };
  pending.forEach(args => q.callMethod(...args)); q.queue = [];
})();`;
const report = { ok: false, assertions: 0, viewports: [], metaReceipt: "NOT TESTED — SDK and transport mocked", serverReceipt: "NOT TESTED — checkout mocked" };
function check(value, message) { assert.ok(value, message); report.assertions++; }
const browser = await chromium.launch({ headless: true });
let debugPage;
let shuttingDown = false;

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ ...(width === 390 ? devices["Pixel 7"] : {}), viewport: { width, height: 900 }, serviceWorkers: "block" });
    const network = [], errors = [], requestKeys = [];
    const transportErrors = [];
    const consoleErrors = [];
    let closingContext = false;
    let status = 200, posts = 0, sdkLoads = 0, abortNext = false, blockSdk = false;
    const purchase = { ok: true, isDemo: false, orderId: `META-QA-${width}`, lookupEmail: "qa@example.com", total: 5747, subtotal: 5997, shipping: 250, discount: 500,
      lines: [{ slug: "tracking-qa-product", name: "Verified QA product", quantity: 2, price: 1999 }, { slug: "server-only-product", name: "Verified second product", quantity: 1, price: 1999 }] };
    await context.route("**/*", async (route) => {
      const handle = async () => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname === "connect.facebook.net" && url.pathname.endsWith("fbevents.js")) {
        sdkLoads++;
        if (blockSdk) return route.abort("blockedbyclient");
        return route.fulfill({ contentType: "application/javascript", body: sdk });
      }
      if (url.hostname === "www.facebook.com" && url.pathname === "/tr/") {
        network.push(JSON.parse(request.postData() || "{}"));
        return route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" });
      }
      if (url.origin !== origin) return route.fulfill({ status: 200, contentType: request.resourceType() === "script" ? "application/javascript" : "text/plain", body: "" });
      if (url.pathname === "/api/checkout" && request.method() === "POST") {
        posts++;
        requestKeys.push(request.headers()["idempotency-key"]);
        if (abortNext) { abortNext = false; return route.abort("timedout"); }
        await new Promise((resolve) => setTimeout(resolve, 150));
        return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status === 200 ? purchase : { ok: false, error: `Meta QA ${status} rejected` }) });
      }
      if (url.pathname.startsWith("/order/META-QA-")) return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><h1>Isolated order confirmation</h1></body></html>" });
      if (!["GET", "HEAD"].includes(request.method())) return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"discount":0,"applied":[]}' });
      const response = await route.fetch({ url: `${local}${url.pathname}${url.search}`, maxRetries: 2 });
      const headers = { ...response.headers(), "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };
      for (const key of ["content-encoding", "content-length", "transfer-encoding", "connection"]) delete headers[key];
      return route.fulfill({ status: response.status(), headers, body: await response.body() });
      };
      await handle().catch(async (error) => {
        if (!shuttingDown && !closingContext) transportErrors.push(String(error));
        await route.abort().catch(() => {});
      });
    });
    const page = await context.newPage();
    debugPage = page;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text(), url = message.location().url;
      const expected = text.startsWith("Failed to load resource:") &&
        (/\/api\/checkout(?:\?|$)/.test(url) || url.includes("connect.facebook.net/") || url.includes("/product/does-not-exist"));
      if (!expected) consoleErrors.push({ text, url });
    });
    const events = async (event) => page.evaluate((event) => (window.__metaEvents || []).filter((entry) => entry.event === event), event);
    const purchases = () => network.filter((entry) => entry.event === "Purchase");
    const fillCheckout = async () => {
      await page.locator("#name").fill("QA Shopper");
      await page.locator("#phone").fill("03001234567");
      await page.locator("#address").fill("QA isolated address");
      await page.locator("#province").selectOption("PB");
      await page.locator("#city").selectOption("lahore");
    };
    const submit = () => page.getByRole("button", { name: /place order|confirm order/i }).first();
    await page.goto(`${origin}/product/tracking-qa-product?fbclid=ISOLATED_META_CLICK`, { waitUntil: "domcontentloaded" });
    check(sdkLoads === 0 && network.length === 0, "no Meta SDK or events before consent");
    await page.evaluate(() => {
      localStorage.setItem("bnt-cookie-consent", "essential");
      dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "essential" }));
    });
    check(sdkLoads === 0, "essential-only consent keeps Meta off");
    await page.evaluate(() => {
      localStorage.setItem("bnt-cookie-consent", "all");
      dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "all" }));
    });
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "PageView"));
    check((await events("PageView")).length === 1, "late grant produces one PageView");
    check(sdkLoads === 1, "one SDK injection");
    check(await page.evaluate((pixel) => window.__metaInitializations.length === 1 && window.__metaInitializations[0] === pixel, pixel), "one correct dataset initialization");
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "ViewContent"));
    check((await events("ViewContent")).length === 1, "late consent grants a current product view without reload");
    check((await context.cookies()).some((cookie) => cookie.name === "_fbc" && /^fb\.1\.\d{13}\.ISOLATED_META_CLICK$/.test(cookie.value)), "original Meta click survives URL cleanup with real timestamp");
    await page.evaluate(() => dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "all" })));
    check((await events("PageView")).length === 1, "repeated grant does not duplicate PageView");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "ViewContent"));
    const views = await events("ViewContent");
    check(views.length === 1 && views[0].properties.content_ids[0] === "tracking-qa-product", "actual product emits one ViewContent with consistent slug ID");
    check(views[0].properties.value === 1999 && views[0].properties.currency === "PKR" && views[0].properties.content_name === "Tracking QA product", "ViewContent product name, price and currency");
    await page.evaluate(() => { window.__spaProbe = true; });
    await page.locator('a[href="/products"]').last().click();
    await page.waitForURL(/\/products$/);
    await page.waitForFunction(() => window.__metaEvents.filter((entry) => entry.event === "PageView").length === 2);
    check(await page.evaluate(() => window.__spaProbe === true), "actual client-side navigation preserves document");
    await page.waitForLoadState("networkidle");
    check((await events("PageView")).length === 2, "client-side navigation emits one PageView");
    await page.locator('a[href*="/product/tracking-qa-product"]').first().click();
    await page.waitForURL(/\/product\/tracking-qa-product/);
    await page.waitForFunction(() => window.__metaEvents.filter((entry) => entry.event === "PageView").length === 3);
    const add = page.getByRole("button", { name: /add to cart|order with cod/i }).first();
    await add.click();
    await page.waitForFunction(() => window.__metaEvents.some((entry) => entry.event === "AddToCart"));
    const added = await events("AddToCart");
    check(added.length === 1 && added[0].properties.content_ids[0] === "tracking-qa-product", "committed cart addition emits correct product ID once");
    check(added[0].properties.contents[0].quantity === 1 && added[0].properties.contents[0].item_price === 1999 && added[0].properties.value === 1999, "AddToCart quantity/unit price/value");
    await page.keyboard.press("Escape");
    await add.click();
    await page.waitForFunction(() => window.__metaEvents.filter((entry) => entry.event === "AddToCart").length === 2);
    check((await events("AddToCart")).length === 2, "second genuine addition remains a separate event");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("ecomm-cart") || "[]")[0]?.quantity === 2);
    const cart = await page.evaluate(() => localStorage.getItem("ecomm-cart"));
    check(JSON.parse(cart)[0].quantity === 2, "cart persistence records both successful additions");
    await page.waitForLoadState("networkidle");
    await page.goto(`${origin}/checkout`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "InitiateCheckout"));
    const initiated = await events("InitiateCheckout");
    check(initiated.length === 1 && initiated[0].properties.num_items === 2, "checkout emits once with actual quantity");
    check(initiated[0].properties.currency === "PKR" && initiated[0].properties.value === 4197 &&
      JSON.stringify(initiated[0].properties.contents) === JSON.stringify([{ id: "tracking-qa-product", quantity: 2, item_price: 1999 }]),
      "checkout uses exact merchandise3998 plus shipping199, PKR and current contents");
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "checkout has no horizontal overflow");
    await submit().click();
    check(posts === 0 && purchases().length === 0, "invalid form cannot create Purchase");
    await fillCheckout();
    check((await events("InitiateCheckout")).length === 1, "form changes do not duplicate checkout event");
    for (status of [400, 409, 429, 500]) {
      const before = posts;
      await submit().click();
      await page.waitForFunction((message) => document.body.innerText.includes(message), `Meta QA ${status} rejected`);
      check(posts === before + 1, `HTTP ${status} makes one mock request`);
      check(purchases().length === 0, `HTTP ${status} produces no Purchase`);
    }
    abortNext = true;
    await submit().click();
    await page.waitForFunction(() => /failed to fetch|network|load failed|fetch failed/i.test(document.body.innerText));
    check(purchases().length === 0, "network timeout/uncertain result produces no false Purchase");
    const uncertainKey = requestKeys.at(-1);
    await page.screenshot({ path: `${output}/checkout-chromium-${width}.png`, fullPage: true });
    status = 200;
    purchase.replayed = true;
    const before = posts;
    await submit().evaluate((button) => { button.click(); button.click(); });
    await page.waitForURL(/\/order\/META-QA-/);
    check(posts === before + 1, "double submission sends one request");
    check(requestKeys.at(-1) === uncertainKey, "retry after uncertain result preserves idempotency key");
    check(purchases().length === 1, "replay recovery emits one browser Purchase");
    check(purchases()[0].eventID === purchase.orderId, "browser eventID matches backend order identity");
    check(purchases()[0].properties.value === 5747 && purchases()[0].properties.currency === "PKR", "Purchase uses authoritative total including shipping minus discount");
    check(JSON.stringify(purchases()[0].properties.contents) === JSON.stringify(purchase.lines.map((line) => ({ id: line.slug, quantity: line.quantity, item_price: line.price }))), "Purchase uses verified multi-product order lines, ignoring stale client cart");
    check(!page.url().includes("email=") && !page.url().includes("phone="), "confirmation URL contains no customer contact parameters");
    await page.reload({ waitUntil: "domcontentloaded" });
    check(purchases().length === 1, "confirmation refresh does not repeat Purchase");
    await page.evaluate((cart) => localStorage.setItem("ecomm-cart", cart), cart);
    await page.goto(`${origin}/checkout`, { waitUntil: "domcontentloaded" });
    await fillCheckout();
    await submit().click();
    await page.waitForURL(/\/order\/META-QA-/);
    check(purchases().length === 1, "same accepted order replay after reload is suppressed locally");
    purchase.orderId += "-SECOND";
    purchase.replayed = false;
    await page.evaluate((cart) => localStorage.setItem("ecomm-cart", cart), cart);
    await page.goto(`${origin}/checkout`, { waitUntil: "domcontentloaded" });
    await fillCheckout();
    await submit().click();
    await page.waitForURL(/-SECOND$/);
    check(purchases().length === 2 && purchases()[1].eventID === purchase.orderId, "second genuine order remains a separate conversion");
    await page.addInitScript(() => Object.defineProperty(navigator, "locks", { configurable: true, value: undefined }));
    purchase.orderId += "-SERVER-ONLY";
    await page.evaluate((cart) => localStorage.setItem("ecomm-cart", cart), cart);
    await page.goto(`${origin}/checkout`, { waitUntil: "domcontentloaded" });
    await fillCheckout();
    await submit().click();
    await page.waitForURL(/-SERVER-ONLY$/);
    check(purchases().length === 2, "without atomic cross-tab locks checkout succeeds using server-only Purchase");
    await page.goto(`${origin}/product/tracking-qa-product`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "PageView"));
    await page.evaluate(() => {
      localStorage.setItem("bnt-cookie-consent", "essential");
      dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "essential" }));
    });
    await page.waitForTimeout(50);
    const beforeRevoked = network.length;
    await page.getByRole("button", { name: /add to cart|order with cod/i }).first().evaluate((button) => button.click());
    await page.waitForTimeout(100);
    check(network.length === beforeRevoked, "consent revocation stops subsequent commerce events");
    await page.evaluate(() => localStorage.setItem("bnt-cookie-consent", "all"));
    blockSdk = true;
    await page.goto(`${origin}/product/tracking-qa-product`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /add to cart|order with cod/i }).first().evaluate((button) => button.click());
    await page.waitForTimeout(100);
    check(await page.evaluate(() => JSON.parse(localStorage.getItem("ecomm-cart") || "[]").length > 0), "blocked third-party SDK does not prevent cart changes");
    check(network.length === beforeRevoked, "blocked SDK cannot claim delivered browser events");
    blockSdk = false;
    await page.goto(`${origin}/product/does-not-exist`, { waitUntil: "domcontentloaded" });
    check((await events("ViewContent")).length === 0, "nonexistent product cannot emit ViewContent");
    await page.goto(`${origin}/product/tracking-qa-product`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__metaEvents?.some((entry) => entry.event === "ViewContent"));
    const beforeCartWriteFailure = network.filter((entry) => entry.event === "AddToCart").length;
    await page.evaluate(() => {
      const write = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "ecomm-cart") throw new DOMException("QA cart write denied", "QuotaExceededError");
        return write.call(this, key, value);
      };
    });
    await page.getByRole("button", { name: /add to cart|order with cod/i }).first().click();
    await page.waitForTimeout(100);
    check(network.filter((entry) => entry.event === "AddToCart").length === beforeCartWriteFailure, "failed cart persistence does not emit AddToCart");
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new DOMException("QA storage restricted", "SecurityError"); };
      Storage.prototype.setItem = function () { throw new DOMException("QA storage restricted", "SecurityError"); };
    });
    const beforeRestricted = sdkLoads;
    await page.goto(`${origin}/product/tracking-qa-product`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /add to cart|order with cod/i }).first().evaluate((button) => button.click());
    await page.waitForTimeout(100);
    check(sdkLoads === beforeRestricted, "restricted storage leaves consent unknown and Pixel disabled");
    check(errors.length === 0, `no browser runtime errors: ${errors.join("; ")}`);
    check(consoleErrors.length === 0, `no unexpected console errors: ${JSON.stringify(consoleErrors)}`);
    check(transportErrors.length === 0, `no proxy transport errors: ${transportErrors.join("; ")}`);
    report.viewports.push({ engine: "chromium", width, assertions: "PASS", mockedCheckoutPosts: posts, purchaseEventIDs: purchases().map((entry) => entry.eventID), runtimeErrors: errors, unexpectedConsoleErrors: consoleErrors });
    closingContext = true;
    await context.close();
  }
  report.ok = true;
} catch (error) {
  shuttingDown = true;
  report.error = String(error);
  if (debugPage && !debugPage.isClosed()) {
    await debugPage.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
    fs.writeFileSync(`${output}/failure.txt`, await debugPage.locator("body").innerText().catch(() => ""));
  }
  throw error;
} finally {
  shuttingDown = true;
  await browser.close();
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
