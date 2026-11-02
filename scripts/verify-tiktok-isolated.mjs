/** Production-build browser gate. All services/analytics/orders are local mocks. */
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, webkit, devices } from "playwright";

const local = process.env.TIKTOK_QA_LOCAL || "http://127.0.0.1:4590";
assert.ok(["127.0.0.1", "localhost"].includes(new URL(local).hostname));
const origin = "https://buyntryy.test";
const output = "tmp/tiktok-browser";
fs.mkdirSync(output, { recursive: true });
const sdk = `(() => {
  const q = window.ttq, pending = q.slice(); let granted = true;
  window.__tiktokEvents = [];
  function send(event, properties = {}, options = {}) {
    if (!granted) return;
    const payload = { event, properties, event_id: options.event_id };
    window.__tiktokEvents.push(payload);
    fetch('https://analytics.tiktok.com/api/v2/pixel', { method:'POST', body:JSON.stringify(payload) });
  }
  q.page = () => send('PageView'); q.track = send;
  q.grantConsent = () => { granted = true; }; q.revokeConsent = () => { granted = false; };
  q.identify = (data) => { window.__tiktokIdentity = data; };
  pending.forEach(([method, ...args]) => q[method]?.(...args));
})();`;
const report = { ok: false, assertions: 0, viewports: [], liveTikTokReception: "NOT TESTED — SDK and transport mocked" };
function check(value, message) { assert.ok(value, message); report.assertions++; }
const browsers = { chromium: await chromium.launch({ headless: true }), webkit: await webkit.launch({ headless: true }) };

try {
  for (const { engine, width } of [{ engine: "chromium", width: 1440 }, { engine: "chromium", width: 390 }, { engine: "webkit", width: 390 }]) {
    const browser = browsers[engine];
    const device = width === 390 ? devices[engine === "webkit" ? "iPhone 13" : "Pixel 7"] : {};
    const context = await browser.newContext({ ...device, viewport: { width, height: 900 }, serviceWorkers: "block" });
    const network = [];
    const errors = [];
    let status = 200;
    let posts = 0;
    const purchase = { ok: true, orderId: `QA-${width}`, lookupEmail: "qa@example.com", total: 2199, subtotal: 1999, shipping: 200,
      lines: [{ slug: "tracking-qa-product", name: "Tracking QA product", sku: "QA-PRODUCT", quantity: 1, price: 1999 }] };
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.hostname === "analytics.tiktok.com") {
        if (url.pathname.endsWith("events.js")) return route.fulfill({ contentType: "application/javascript", body: sdk });
        network.push(JSON.parse(request.postData() || "{}"));
        return route.fulfill({ status: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" });
      }
      if (url.origin !== origin) {
        return route.fulfill({ status: 200, contentType: request.resourceType() === "script" ? "application/javascript" : "text/plain", body: "" });
      }
      if (url.pathname === "/api/checkout" && request.method() === "POST") {
        posts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(status === 200 ? purchase : { ok: false, error: `QA ${status} rejected` }) });
      }
      if (url.pathname.startsWith("/order/QA-")) {
        return route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body><h1>Isolated order confirmation</h1></body></html>" });
      }
      if (!["GET", "HEAD"].includes(request.method())) {
        // Quote/abandonment/newsletter requests cannot reach any backend.
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"discount":0,"applied":[]}' });
      }
      const response = await route.fetch({ url: `${local}${url.pathname}${url.search}` });
      // Re-serve bytes under the synthetic origin; retain no upstream URL metadata.
      const headers = { ...response.headers(), "access-control-allow-origin": origin, "access-control-allow-credentials": "true" };
      for (const key of ["content-encoding", "content-length", "transfer-encoding", "connection"]) delete headers[key];
      return route.fulfill({ status: response.status(), headers, body: await response.body() });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    const events = async (event) => page.evaluate((event) => (window.__tiktokEvents || []).filter((entry) => entry.event === event), event);
    await page.goto(`${origin}/product/tracking-qa-product`, { waitUntil: "networkidle" });
    check(await page.evaluate(() => typeof window.ttq === "undefined"), "no Pixel before consent");
    check(network.length === 0, "no TikTok transport before consent");
    await page.evaluate(() => {
      localStorage.setItem("bnt-cookie-consent", "essential");
      dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "essential" }));
    });
    check(await page.evaluate(() => typeof window.ttq === "undefined"), "essentials-only stays off");
    await page.evaluate(() => {
      localStorage.setItem("bnt-cookie-consent", "all");
      dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "all" }));
    });
    await page.waitForFunction(() => window.__tiktokEvents?.some((event) => event.event === "PageView"));
    check((await events("PageView")).length === 1, "late grant produces exactly one PageView");
    await page.evaluate(() => dispatchEvent(new CustomEvent("bnt-cookie-consent-change", { detail: "all" })));
    check((await events("PageView")).length === 1, "repeated grant does not duplicate PageView");
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__tiktokEvents?.some((event) => event.event === "ViewContent"));
    const views = await events("ViewContent");
    check(views.length === 1 && views[0].properties.contents[0].content_id === "QA-PRODUCT", "actual PDP emits one catalog-compatible ViewContent");
    check(views[0].properties.value === 1999 && views[0].properties.currency === "PKR", "PDP price and currency are correct");
    await page.evaluate(() => { window.__spaProbe = "same-document"; });
    await page.locator('a[href="/products"]').last().click();
    await page.waitForURL(/\/products$/);
    await page.waitForFunction(() => window.__tiktokEvents.filter((entry) => entry.event === "PageView").length === 2);
    await page.waitForLoadState("networkidle");
    check(await page.evaluate(() => window.__spaProbe === "same-document"), "products link uses actual SPA navigation");
    check((await events("PageView")).length === 2, "SPA products navigation emits one PageView");
    await page.locator('a[href*="/product/tracking-qa-product"]').first().click();
    await page.waitForURL(/\/product\/tracking-qa-product/);
    await page.waitForFunction(() => window.__tiktokEvents.filter((entry) => entry.event === "PageView").length === 3);
    await page.waitForLoadState("networkidle");
    check((await events("PageView")).length === 3, "SPA product navigation emits one PageView");
    await page.getByRole("button", { name: /add to cart|order with cod/i }).first().click();
    await page.waitForFunction(() => window.__tiktokEvents.some((entry) => entry.event === "AddToCart"));
    check((await events("AddToCart")).length === 1, "valid cart action emits one AddToCart");
    const cart = await page.evaluate(() => localStorage.getItem("ecomm-cart"));
    check(JSON.parse(cart).length === 1, "cart contains actual selected product");
    // Settle Next's link prefetch before replacing the document in this proxy harness.
    await page.waitForLoadState("networkidle");
    await page.goto(`${origin}/checkout`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__tiktokEvents?.some((entry) => entry.event === "InitiateCheckout"));
    check((await events("InitiateCheckout")).length === 1, "settled checkout emits once");
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "checkout has no horizontal overflow");
    const submit = page.getByRole("button", { name: /place order|confirm order/i }).first();
    await submit.click();
    check(posts === 0, "invalid form cannot submit or convert");
    await page.locator("#name").fill("QA Shopper");
    await page.locator("#phone").fill("03001234567");
    await page.locator("#address").fill("QA isolated test address");
    await page.locator("#province").selectOption("PB");
    await page.locator("#city").selectOption("lahore");
    for (status of [409, 429, 500]) {
      const before = posts;
      await submit.click();
      await page.waitForFunction((message) => document.body.innerText.includes(message), `QA ${status} rejected`);
      check(posts === before + 1, `HTTP ${status} executes one mocked request`);
      check((await events("Purchase")).length === 0, `HTTP ${status} cannot emit Purchase`);
    }
    await page.screenshot({ path: `${output}/checkout-${engine}-${width}.png`, fullPage: true });
    status = 200;
    const before = posts;
    await submit.evaluate((button) => { button.click(); button.click(); });
    await page.waitForURL(/\/order\/QA-/);
    check(posts === before + 1, "rapid duplicate submission creates one request");
    const purchases = network.filter((entry) => entry.event === "Purchase");
    check(purchases.length === 1, "accepted order delivers one browser Purchase");
    check(purchases[0].event_id === `purchase_QA-${width}`, "Purchase uses stable backend-compatible event ID");
    check(purchases[0].properties.value === 2199 && purchases[0].properties.currency === "PKR", "Purchase uses authoritative total and PKR");
    check(!page.url().includes("phone=") && !page.url().includes("email="), "confirmation URL contains no matching PII");
    await page.reload({ waitUntil: "networkidle" });
    check(network.filter((entry) => entry.event === "Purchase").length === 1, "confirmation refresh does not repeat Purchase");
    purchase.replayed = true;
    await page.evaluate((cart) => localStorage.setItem("ecomm-cart", cart), cart);
    await page.goto(`${origin}/checkout`, { waitUntil: "networkidle" });
    await page.locator("#name").fill("QA Shopper");
    await page.locator("#phone").fill("03001234567");
    await page.locator("#address").fill("QA isolated test address");
    await page.locator("#province").selectOption("PB");
    await page.locator("#city").selectOption("lahore");
    await page.getByRole("button", { name: /place order|confirm order/i }).first().click();
    await page.waitForURL(/\/order\/QA-/);
    check(network.filter((entry) => entry.event === "Purchase").length === 1, "idempotent replay after reload does not duplicate Purchase");
    check(errors.length === 0, `no browser runtime errors: ${errors.join("; ")}`);
    report.viewports.push({ engine, width, assertions: "PASS", mockedCheckoutPosts: posts, purchaseEventId: purchases[0].event_id });
    await context.close();
  }
  report.ok = true;
} finally {
  await Promise.all(Object.values(browsers).map((browser) => browser.close()));
  fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
