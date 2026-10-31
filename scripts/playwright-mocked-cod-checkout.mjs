/**
 * Mobile COD checkout verification with mocked /api/checkout.
 * Never hits real courier booking — route is intercepted.
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
};

function step(name, data = {}) {
  report.steps.push({ name, ...data, at: new Date().toISOString() });
  console.log("STEP", name, data);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

let checkoutPosts = 0;
await page.route("**/api/checkout**", async (route) => {
  if (route.request().method() === "POST") {
    checkoutPosts += 1;
    const body = route.request().postDataJSON?.() || {};
    // Always mock success — never create real orders
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        orderId: `MOCK-${Date.now()}`,
        orderNumber: `BNT-MOCK-${checkoutPosts}`,
        total: body?.pricing?.total ?? 1999,
        mocked: true,
      }),
    });
    return;
  }
  await route.continue();
});

// Mock confirmation page so redirect after mocked order is not a real 404
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
  await page.waitForTimeout(1200);
  const priceText = await page
    .locator("text=/Rs\\s*[0-9]/")
    .first()
    .textContent()
    .catch(() => null);
  step("pdp-price-visible", { priceText });

  const add = page
    .locator(
      'button:has-text("Add to cart"), button:has-text("Order with COD")',
    )
    .first();
  if (!(await add.count())) throw new Error("Add to cart button missing");
  const disabled = await add.isDisabled().catch(() => false);
  if (disabled) throw new Error("Add to cart disabled (sold out / invalid price?)");
  await add.click();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-after-add.png"),
    fullPage: true,
  });
  step("add-to-cart");

  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-cart-filled.png"),
    fullPage: true,
  });
  const cartHasItem = (await page.locator("text=/stylus|Rs/i").count()) > 0;
  step("cart-filled", { cartHasItem });

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-empty-fields.png"),
    fullPage: true,
  });

  // Attempt submit with empty required fields → validation
  const submit = page
    .locator(
      'button:has-text("Place order"), button:has-text("Confirm order"), button:has-text("Complete"), button[type="submit"]',
    )
    .first();
  if (await submit.count()) {
    await submit.click();
    await page.waitForTimeout(700);
    await page.screenshot({
      path: path.join(OUT, "mobile-mock-checkout-validation.png"),
      fullPage: true,
    });
    step("validation-click", { posts: checkoutPosts });
  } else {
    step("validation-click", { skipped: "no submit button found" });
  }

  // Fill plausible PK COD fields (best-effort selectors)
  const fillIf = async (selectors, value) => {
    for (const sel of selectors) {
      const loc = page.locator(sel).first();
      if (await loc.count()) {
        await loc.fill(value).catch(() => {});
        return true;
      }
    }
    return false;
  };

  await fillIf(
    [
      'input[name="name"]',
      'input[name="fullName"]',
      'input[autocomplete="name"]',
      'input[placeholder*="Name" i]',
    ],
    "Test Shopper",
  );
  await fillIf(
    [
      'input[name="phone"]',
      'input[name="mobile"]',
      'input[type="tel"]',
      'input[autocomplete="tel"]',
    ],
    "03001234567",
  );
  await fillIf(
    [
      'textarea[name="address"]',
      'input[name="address"]',
      'textarea[placeholder*="Address" i]',
    ],
    "House 1, Test Street, Block A",
  );
  await fillIf(
    ['input[name="city"]', 'input[placeholder*="City" i]'],
    "Lahore",
  );

  // Province/city selects if present
  const province = page.locator("select").first();
  if (await province.count()) {
    await province.selectOption({ index: 1 }).catch(() => {});
  }

  await page.screenshot({
    path: path.join(OUT, "mobile-mock-checkout-filled.png"),
    fullPage: true,
  });

  if (await submit.count()) {
    const before = checkoutPosts;
    await submit.click();
    await page.waitForTimeout(1500);
    // Double-click to probe duplicate submission protection
    await submit.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(OUT, "mobile-mock-checkout-after-submit.png"),
      fullPage: true,
    });
    step("submit-mocked", {
      posts: checkoutPosts,
      delta: checkoutPosts - before,
    });
  }

  report.checkoutPosts = checkoutPosts;
  report.finishedAt = new Date().toISOString();
} catch (err) {
  report.ok = false;
  report.error = String(err);
  console.error(err);
}

fs.writeFileSync(
  path.join(OUT, "mocked-cod-checkout-report.json"),
  JSON.stringify(report, null, 2),
);
await browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
