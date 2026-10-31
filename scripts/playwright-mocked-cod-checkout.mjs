/**
 * Fail-closed mocked COD checkout gate (390px).
 *
 * - Origin-scoped Vercel Protection Bypass (never third-party).
 * - All /api/checkout POSTs intercepted — never creates real orders.
 * - Exit 1 on SSO, missing confirmation, wrong POST counts, or critical errors.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = path.resolve("docs/audit/redesign-2026-11-01");
fs.mkdirSync(OUT, { recursive: true });

const PDP = "/product/universal-active-stylus-pen";
const BYPASS = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
const preview = new URL(BASE);
const allowedOrigin = preview.origin;
const isVercelHost = /\.vercel\.app$/i.test(preview.hostname);

const facts = {
  previewAccess: false,
  ssoDetected: false,
  bypassConfigured: Boolean(BYPASS),
  bypassAppliedOriginScoped: false,
  invalidCheckoutPosts: 0,
  validCheckoutPosts: 0,
  duplicateCheckoutPosts: 0,
  errorPosts: { "409": 0, "429": 0, "500": 0 },
  provincePresent: false,
  cityPresent: false,
  confirmationVisible: false,
  runtimeErrors: 0,
  results409: "UNTESTED",
  results429: "UNTESTED",
  results500: "UNTESTED",
  exitCode: 1,
};

const report = {
  base: BASE,
  allowedOrigin,
  startedAt: new Date().toISOString(),
  commitHint: process.env.GITHUB_SHA || null,
  steps: [],
  assertions: [],
  facts,
  ok: true,
};

function step(name, data = {}) {
  report.steps.push({ name, ...data, at: new Date().toISOString() });
  console.log("STEP", name, data);
}

function assert(condition, message, detail = {}) {
  report.assertions.push({ ok: Boolean(condition), message, ...detail });
  if (!condition) {
    report.ok = false;
    throw new Error(`ASSERT: ${message} ${JSON.stringify(detail)}`);
  }
}

function isSsoUrl(url) {
  return /vercel\.com\/(login|sso-api|sso)/i.test(url);
}

function looksLikeVercelLogin(title, body) {
  return (
    /login\s*[–-]\s*vercel/i.test(title || "") ||
    /log in to vercel/i.test(body || "") ||
    /authentication required/i.test(body || "")
  );
}

async function assertStorefrontAccess(page, expectedPathPrefix) {
  const url = page.url();
  const title = await page.title().catch(() => "");
  const body = await page.locator("body").innerText().catch(() => "");
  const sso = isSsoUrl(url) || looksLikeVercelLogin(title, body);
  facts.ssoDetected = facts.ssoDetected || sso;
  assert(!sso, "Must not land on Vercel SSO/login", {
    url,
    title: title.slice(0, 80),
  });
  assert(
    url.startsWith(allowedOrigin),
    "Must stay on approved Preview origin",
    { url, allowedOrigin },
  );
  if (expectedPathPrefix) {
    assert(
      new URL(url).pathname.startsWith(expectedPathPrefix),
      `Expected path prefix ${expectedPathPrefix}`,
      { url },
    );
  }
  facts.previewAccess = true;
}

async function readyShot(page, fileName) {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.locator("main, body").first().waitFor({ state: "visible" });
  await page.screenshot({ path: path.join(OUT, fileName), fullPage: true });
}

/** @type {"success"|"409"|"429"|"500"} */
let checkoutMode = "success";
/** @type {unknown[]} */
const checkoutPosts = [];
/** @type {unknown[]} */
const successPosts = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
});
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (error) =>
  pageErrors.push(String(error.message || error)),
);
page.on("console", (msg) => {
  if (msg.type() === "error") pageErrors.push(msg.text());
});

// Origin-scoped bypass — never attach secret to third-party origins.
await context.route("**/*", async (route) => {
  const request = route.request();
  const url = new URL(request.url());

  if (url.origin === allowedOrigin && BYPASS) {
    facts.bypassAppliedOriginScoped = true;
    const headers = {
      ...request.headers(),
      "x-vercel-protection-bypass": BYPASS,
      "x-vercel-set-bypass-cookie": "true",
    };
    await route.continue({ headers });
    return;
  }
  await route.continue();
});

await page.route("**/api/checkout**", async (route) => {
  if (route.request().method() !== "POST") {
    return route.continue();
  }

  let body = {};
  try {
    body = route.request().postDataJSON() || {};
  } catch {
    body = {};
  }
  checkoutPosts.push({ mode: checkoutMode, body });

  if (checkoutMode === "409") {
    facts.errorPosts["409"] += 1;
    await route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        code: "PRICE_CHANGED",
        error: "Prices updated",
        items: [],
        lines: [],
        subtotal: 1899,
        shipping: 0,
        total: 1899,
      }),
    });
    return;
  }
  if (checkoutMode === "429") {
    facts.errorPosts["429"] += 1;
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Too many attempts. Please wait a moment and try again.",
      }),
    });
    return;
  }
  if (checkoutMode === "500") {
    facts.errorPosts["500"] += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "We couldn't store your order. Please try again.",
      }),
    });
    return;
  }

  successPosts.push(body);
  facts.validCheckoutPosts = successPosts.length;
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ok: true,
      orderId: `MOCK-${String(successPosts.length).padStart(3, "0")}`,
      orderNumber: `BNT-MOCK-${successPosts.length}`,
      subtotal: 1999,
      shipping: 0,
      total: 1999,
      lines: [],
      mocked: true,
    }),
  });
});

await page.route("**/order/MOCK-**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "text/html",
    body: `<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#faf6ee;color:#0e2419">
      <main>
        <h1>Order received (mock)</h1>
        <p>Isolated Playwright mock — no courier booking created.</p>
        <a href="/">Back home</a>
      </main>
    </body></html>`,
  });
});

try {
  if (isVercelHost && !BYPASS) {
    assert(
      false,
      "Protected Preview requires VERCEL_AUTOMATION_BYPASS_SECRET (origin-scoped). Secret absent.",
      { host: preview.hostname },
    );
  }

  await page.goto(`${BASE}${PDP}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await assertStorefrontAccess(page, "/product/");
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  const priceText = await page
    .locator("text=/Rs\\s*[0-9]/")
    .first()
    .textContent({ timeout: 20000 })
    .catch(() => null);
  const priceMatch = priceText?.match(/Rs\s*([0-9][0-9,]*)/i);
  const priceNum = priceMatch
    ? Number(priceMatch[1].replace(/,/g, ""))
    : 0;
  assert(priceNum > 0, "PDP positive price visible", { priceText, priceNum });
  step("pdp-price-visible", { priceText, priceNum });

  const add = page
    .getByRole("button", { name: /add to cart|order with cod/i })
    .first();
  await add.waitFor({ state: "visible", timeout: 15000 });
  assert(!(await add.isDisabled()), "Add to cart enabled");
  await add.click();
  await page
    .getByRole("button", { name: /add to cart|order with cod/i })
    .first()
    .waitFor({ state: "visible", timeout: 5000 })
    .catch(() => {});
  await readyShot(page, "mobile-mock-after-add.png");
  step("add-to-cart");

  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await assertStorefrontAccess(page, "/cart");
  const cartHasItem =
    (await page.locator("text=/stylus|Rs/i").count()) > 0 ||
    (await page.getByRole("link", { name: /stylus/i }).count()) > 0;
  assert(cartHasItem, "Cart retains expected item");
  await readyShot(page, "mobile-mock-cart-filled.png");
  step("cart-filled", { cartHasItem });

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await assertStorefrontAccess(page, "/checkout");
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  const phone = page.locator('input[name="phone"], #phone, input[type="tel"]').first();
  await phone.waitFor({ state: "visible", timeout: 20000 });
  assert((await phone.count()) > 0, "Checkout phone field visible");
  await readyShot(page, "mobile-mock-checkout-empty-fields.png");

  const submit = page
    .getByRole("button", { name: /place order|confirm order/i })
    .first();
  await submit.waitFor({ state: "visible", timeout: 15000 });

  // Invalid → zero POSTs
  const postsBeforeInvalid = checkoutPosts.length;
  await submit.click();
  await page
    .locator("#checkout-name-error, #checkout-phone-error, #checkout-province-error, [role='alert']")
    .first()
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});
  facts.invalidCheckoutPosts = checkoutPosts.length - postsBeforeInvalid;
  assert(
    facts.invalidCheckoutPosts === 0,
    "Invalid form must produce zero checkout POSTs",
    { posts: facts.invalidCheckoutPosts },
  );
  await readyShot(page, "mobile-mock-checkout-validation.png");
  step("validation-zero-posts");

  await page.locator('input[name="name"], #name').first().fill("Test Shopper");
  await phone.fill("03001234567");
  await page
    .locator('input[name="address"], #address')
    .first()
    .fill("House 1, Test Street, Block A");

  const province = page.locator("select#province, select[name='province']").first();
  assert((await province.count()) > 0, "Province select present");
  await province.selectOption({ label: "Punjab" }).catch(async () => {
    await province.selectOption("PB");
  });
  const city = page.locator("select#city, select[name='cityId']").first();
  await city.waitFor({ state: "visible" });
  const cityOptions = await city.locator("option").count();
  assert(cityOptions > 1, "City options populated after province", {
    cityOptions,
  });
  await city.selectOption({ label: "Lahore" }).catch(async () => {
    await city.selectOption("lahore");
  });
  await readyShot(page, "mobile-mock-checkout-filled.png");

  // Preserve field values across error recoveries
  async function assertFieldsRetained() {
    const nameVal = await page.locator("#name").inputValue();
    const phoneVal = await phone.inputValue();
    assert(/Test Shopper/i.test(nameVal), "Name retained after error", {
      nameVal,
    });
    assert(/0300/.test(phoneVal), "Phone retained after error", { phoneVal });
  }

  // 409
  checkoutMode = "409";
  await submit.click();
  await page
    .getByText(/prices updated/i)
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  assert(
    page.url().includes("/checkout"),
    "409 must keep user on checkout",
    { url: page.url() },
  );
  assert(successPosts.length === 0, "409 must not produce success order");
  await assertFieldsRetained();
  await readyShot(page, "mobile-mock-checkout-409.png");
  facts.results409 = "PASS";
  step("error-409");

  // 429
  checkoutMode = "429";
  await submit.click();
  await page
    .getByText(/too many attempts|try again|wait/i)
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  assert(page.url().includes("/checkout"), "429 stays on checkout");
  assert(successPosts.length === 0, "429 must not produce success order");
  await assertFieldsRetained();
  await readyShot(page, "mobile-mock-checkout-429.png");
  facts.results429 = "PASS";
  step("error-429");

  // 500
  checkoutMode = "500";
  await submit.click();
  await page
    .getByText(/couldn'?t store|try again|failed|something went wrong/i)
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  assert(page.url().includes("/checkout"), "500 stays on checkout");
  assert(successPosts.length === 0, "500 must not produce success order");
  await assertFieldsRetained();
  await readyShot(page, "mobile-mock-checkout-500.png");
  facts.results500 = "PASS";
  step("error-500");

  // Valid success — exactly one success POST
  checkoutMode = "success";
  const beforeSuccess = successPosts.length;
  await submit.click();

  const deadline = Date.now() + 12000;
  while (Date.now() < deadline && successPosts.length < beforeSuccess + 1) {
    await page.waitForTimeout(100);
  }
  assert(
    successPosts.length === beforeSuccess + 1,
    "Valid submit must produce exactly one success checkout POST",
    { successPosts: successPosts.length, beforeSuccess },
  );

  // Double-submit while/after — must not create another success POST
  await submit.click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(800);
  facts.duplicateCheckoutPosts = Math.max(
    0,
    successPosts.length - (beforeSuccess + 1),
  );
  assert(
    facts.duplicateCheckoutPosts === 0,
    "Double submit must not create second success POST",
    { successPosts: successPosts.length },
  );
  facts.validCheckoutPosts = successPosts.length;

  const payload = successPosts[successPosts.length - 1];
  assert(
    String(payload?.payment?.method || "cod").toLowerCase() === "cod",
    "Payment method is COD",
    { payment: payload?.payment },
  );
  assert(
    Array.isArray(payload?.items) && payload.items.length > 0,
    "Payload includes cart items",
    { items: payload?.items?.length },
  );
  facts.provincePresent = Boolean(payload?.customer?.province);
  facts.cityPresent = Boolean(
    payload?.customer?.city || payload?.customer?.cityId,
  );
  assert(facts.provincePresent, "Payload includes province", {
    province: payload?.customer?.province,
  });
  assert(facts.cityPresent, "Payload includes city", {
    city: payload?.customer?.city,
    cityId: payload?.customer?.cityId,
  });
  assert(
    Boolean(payload?.customer?.name && payload?.customer?.phone),
    "Payload includes customer name/phone",
  );
  assert(
    Boolean(payload?.idempotencyKey || payload?.idempotency_key),
    "Payload includes idempotency key",
  );

  await page.waitForURL(/\/order\/MOCK-/i, { timeout: 15000 });
  await assertStorefrontAccess(page, "/order/");
  const confirmHeading = page.getByRole("heading", {
    name: /order received|thank|confirmed|mock/i,
  });
  await confirmHeading.waitFor({ state: "visible", timeout: 10000 });
  facts.confirmationVisible = true;
  await readyShot(page, "mobile-mock-checkout-confirmation.png");
  step("confirmation", { url: page.url() });

  const criticalPageErrors = pageErrors.filter(
    (e) =>
      !/favicon|third-party|tiktok|facebook|clarity|gtag|ads|vercel/i.test(e),
  );
  facts.runtimeErrors = criticalPageErrors.length;
  assert(facts.runtimeErrors === 0, "No unexpected page errors", {
    criticalPageErrors,
  });

  // Mathematical fail-closed gate
  assert(
    facts.validCheckoutPosts === 1 && facts.confirmationVisible === true,
    "PASS requires exactly 1 valid POST and confirmationVisible",
    {
      validCheckoutPosts: facts.validCheckoutPosts,
      confirmationVisible: facts.confirmationVisible,
    },
  );

  report.samplePayload = {
    payment: payload?.payment,
    itemCount: payload?.items?.length,
    province: payload?.customer?.province,
    city: payload?.customer?.city,
    cityId: payload?.customer?.cityId,
    hasIdempotency: Boolean(
      payload?.idempotencyKey || payload?.idempotency_key,
    ),
  };
  report.finishedAt = new Date().toISOString();
} catch (err) {
  report.ok = false;
  report.error = String(err);
  console.error(err);
  try {
    const url = page.url();
    facts.ssoDetected = facts.ssoDetected || isSsoUrl(url);
    await page.screenshot({
      path: path.join(OUT, "mobile-mock-checkout-failure.png"),
      fullPage: true,
    });
  } catch {
    // ignore
  }
}

facts.validCheckoutPosts = successPosts.length;
facts.exitCode = report.ok ? 0 : 1;
if (
  !report.ok ||
  facts.validCheckoutPosts !== 1 ||
  facts.confirmationVisible !== true ||
  facts.ssoDetected
) {
  report.ok = false;
  facts.exitCode = 1;
}

// Never include bypass secret material
report.facts = { ...facts };
delete report.bypassSecret;
fs.writeFileSync(
  path.join(OUT, "mocked-cod-checkout-report.json"),
  JSON.stringify(report, null, 2),
);
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(facts.exitCode);
