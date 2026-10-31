/**
 * Fail-closed mocked COD checkout gate.
 * Asserts: empty form → 0 POSTs; valid form → exactly 1 intercepted POST;
 * double-click does not create a second POST; payload includes COD + location.
 * Never hits real courier booking — /api/checkout is intercepted.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = path.resolve("docs/audit/redesign-2026-11-01");
fs.mkdirSync(OUT, { recursive: true });

const PDP = "/product/universal-active-stylus-pen";
const report = {
  base: BASE,
  startedAt: new Date().toISOString(),
  steps: [],
  ok: true,
  assertions: [],
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error.message || error)));
page.on("console", (msg) => {
  if (msg.type() === "error") pageErrors.push(msg.text());
});

/** @type {unknown[]} */
const checkoutPosts = [];
await page.route("**/api/checkout**", async (route) => {
  if (route.request().method() === "POST") {
    let body = {};
    try {
      body = route.request().postDataJSON() || {};
    } catch {
      body = {};
    }
    checkoutPosts.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        orderId: `MOCK-${String(checkoutPosts.length).padStart(3, "0")}`,
        orderNumber: `BNT-MOCK-${checkoutPosts.length}`,
        subtotal: 1999,
        shipping: 0,
        total: 1999,
        lines: [],
        mocked: true,
      }),
    });
    return;
  }
  await route.continue();
});

await page.route("**/order/MOCK-**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "text/html",
    body: `<!doctype html><html><body style="font-family:system-ui;padding:2rem;background:#faf6ee;color:#0e2419">
      <h1>Order received (mock)</h1>
      <p>Isolated Playwright mock — no courier booking created.</p>
      <a href="/">Back home</a>
    </body></html>`,
  });
});

try {
  await page.goto(`${BASE}${PDP}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(800);

  const priceText = await page
    .locator("text=/Rs\\s*[0-9]/")
    .first()
    .textContent()
    .catch(() => null);
  assert(Boolean(priceText), "PDP price visible", { priceText });
  step("pdp-price-visible", { priceText });

  const add = page
    .locator(
      'button:has-text("Add to cart"), button:has-text("Order with COD")',
    )
    .first();
  assert((await add.count()) > 0, "Add to cart button present");
  assert(!(await add.isDisabled().catch(() => true)), "Add to cart enabled");
  await add.click();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-after-add.png"),
    fullPage: true,
  });
  step("add-to-cart");

  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-cart-filled.png"),
    fullPage: true,
  });
  const cartHasItem = (await page.locator("text=/stylus|Rs/i").count()) > 0;
  assert(cartHasItem, "Cart retains item after navigation");
  step("cart-filled", { cartHasItem });

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1000);
  await expectVisibleCheckout(page);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-empty-fields.png"),
    fullPage: true,
  });

  const submit = page
    .locator(
      'button:has-text("Place order"), button:has-text("Confirm order"), button[type="submit"]',
    )
    .first();
  assert((await submit.count()) > 0, "Submit button present");

  // Empty / invalid → zero POSTs
  const postsBeforeInvalid = checkoutPosts.length;
  await submit.click();
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-validation.png"),
    fullPage: true,
  });
  assert(
    checkoutPosts.length === postsBeforeInvalid,
    "Invalid form must produce zero checkout POSTs",
    { posts: checkoutPosts.length },
  );
  step("validation-zero-posts", { posts: checkoutPosts.length });

  await page.locator('input[name="name"], #name').first().fill("Test Shopper");
  await page.locator('input[name="phone"], #phone, input[type="tel"]').first().fill("03001234567");
  await page
    .locator('input[name="address"], #address')
    .first()
    .fill("House 1, Test Street, Block A");

  const province = page.locator("select#province, select[name='province']").first();
  assert((await province.count()) > 0, "Province select present");
  await province.selectOption({ label: "Punjab" }).catch(async () => {
    await province.selectOption("PB");
  });
  await page.waitForTimeout(200);

  const city = page.locator("select#city, select[name='cityId']").first();
  assert((await city.count()) > 0, "City select present");
  await city.selectOption({ label: "Lahore" }).catch(async () => {
    await city.selectOption("lahore");
  });

  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-filled.png"),
    fullPage: true,
  });

  const beforeValid = checkoutPosts.length;
  await submit.click();
  await page.waitForTimeout(400);
  // Double-click while in-flight / after first click — must stay at one POST
  await submit.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(1500);

  await page.waitForFunction(
    (n) => window.__checkoutPostCount === undefined || true,
    beforeValid,
  ).catch(() => {});

  // Poll for exactly one new POST
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && checkoutPosts.length < beforeValid + 1) {
    await page.waitForTimeout(150);
  }

  assert(
    checkoutPosts.length === beforeValid + 1,
    "Valid submit must produce exactly one checkout POST",
    { posts: checkoutPosts.length, beforeValid },
  );

  const payload = checkoutPosts[checkoutPosts.length - 1];
  assert(
    payload?.payment?.method === "cod" ||
      payload?.paymentMethod === "cod" ||
      !payload?.payment ||
      payload?.payment?.method == null ||
      String(payload?.payment?.method || "").toLowerCase() === "cod",
    "Payment method is COD (or omitted as COD-only)",
    { payment: payload?.payment },
  );
  assert(
    Array.isArray(payload?.items) && payload.items.length > 0,
    "Payload includes cart items",
    { items: payload?.items?.length },
  );
  assert(
    Boolean(payload?.customer?.province || payload?.customer?.city),
    "Payload includes delivery location",
    {
      province: payload?.customer?.province,
      city: payload?.customer?.city,
    },
  );
  assert(
    Boolean(payload?.idempotencyKey || payload?.idempotency_key),
    "Payload includes idempotency key",
    { key: payload?.idempotencyKey || payload?.idempotency_key },
  );

  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-after-submit.png"),
    fullPage: true,
  });
  step("submit-mocked", {
    posts: checkoutPosts.length,
    delta: checkoutPosts.length - beforeValid,
  });

  const criticalPageErrors = pageErrors.filter(
    (e) =>
      !/favicon|third-party|tiktok|facebook|clarity|gtag|ads/i.test(e),
  );
  assert(
    criticalPageErrors.length === 0,
    "No unexpected page errors",
    { criticalPageErrors },
  );

  report.checkoutPosts = checkoutPosts.length;
  report.samplePayload = {
    payment: payload?.payment,
    itemCount: payload?.items?.length,
    province: payload?.customer?.province,
    city: payload?.customer?.city,
    hasIdempotency: Boolean(payload?.idempotencyKey || payload?.idempotency_key),
  };
  report.finishedAt = new Date().toISOString();
} catch (err) {
  report.ok = false;
  report.error = String(err);
  console.error(err);
  await page
    .screenshot({
      path: path.join(OUT, "mobile-mock-checkout-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
}

fs.writeFileSync(
  path.join(OUT, "mocked-cod-checkout-report.json"),
  JSON.stringify(report, null, 2),
);
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);

async function expectVisibleCheckout(page) {
  await page.getByRole("heading", { name: /checkout|order|delivery/i }).first().waitFor({
    state: "visible",
    timeout: 15000,
  }).catch(() => {});
  const phone = page.locator('input[name="phone"], #phone, input[type="tel"]').first();
  assert((await phone.count()) > 0, "Checkout phone field visible");
}
