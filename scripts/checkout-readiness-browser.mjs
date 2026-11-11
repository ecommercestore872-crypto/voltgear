import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const base = process.env.CHECKOUT_TEST_BASE_URL ?? "http://localhost:3042";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) {
  throw new Error("Checkout browser test only supports a local server.");
}

const regions = [
  ["punjab", "Lahore"],
  ["sindh", "Karachi"],
  ["khyber-pakhtunkhwa", "Peshawar"],
  ["balochistan", "Quetta"],
  ["islamabad-capital-territory", "Islamabad"],
  ["azad-jammu-kashmir", "Muzaffarabad"],
  ["gilgit-baltistan", "Gilgit"],
];

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1366, height: 900 } }],
    ["android", devices["Pixel 7"]],
  ]) {
    if (process.env.CHECKOUT_TEST_DEVICE && name !== process.env.CHECKOUT_TEST_DEVICE) continue;
    const context = await browser.newContext(options);
    await context.addInitScript((restrictedStorage) => {
      localStorage.setItem("bnt-cookie-consent", "essential");
      localStorage.setItem("ecomm-cart", JSON.stringify([{ slug: "qa-charger", name: "QA Charger", price: 1500, quantity: 2 }]));
      if (restrictedStorage) {
        for (const method of ["getItem", "setItem", "removeItem"]) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (key, ...args) {
            if ((this === sessionStorage && key === "buy_n_try_checkout_idem") ||
                (this === localStorage && key === "bnt-cookie-consent")) {
              throw new DOMException("Storage blocked", "SecurityError");
            }
            return original.call(this, key, ...args);
          };
        }
      }
    }, name === "android");
    const page = await context.newPage();
    let pageErrors = 0;
    page.on("pageerror", (error) => {
      pageErrors += 1;
      if (pageErrors <= 3) process.stderr.write(`${name} page error: ${error.stack}\n`);
    });
    const sent = [];
    await page.route("**/api/deals/quote", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"discount":0,"applied":[]}' }));
    await page.route("**/api/checkout", async (route) => {
      sent.push(JSON.parse(route.request().postData() ?? "{}"));
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, orderId: "BNT-QA-MOCK", lookupEmail: "qa@example.test", subtotal: 3000, shipping: 0, total: 3000, lines: [{ slug: "qa-charger", name: "QA Charger", price: 1500, quantity: 2 }] }),
      });
    });
    await page.route("**/order/BNT-QA-MOCK**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Mock order confirmation</body></html>" }));
    await page.goto(`${base}/checkout`, { waitUntil: "domcontentloaded" });
    await page.locator("h2", { hasText: "Your delivery details" }).waitFor({ timeout: 30000 });
    assert.equal(await page.getByText("Your cart is empty").count(), 0, `${name}: restored cart`);
    assert.equal(await page.locator('input[name="email"]').count(), 1, `${name}: one email control`);
    assert.equal(await page.locator('input[name="city"]').count(), 1, `${name}: one city control`);

    const submit = page.locator('button[form="details-form"]:visible').first();
    await submit.click();
    try {
      await page.getByText("Select a province or region.").waitFor({ timeout: 5000 });
    } catch (error) {
      process.stderr.write(`${name} submit debug: ${JSON.stringify({ url: page.url(), formCount: await page.locator('#details-form').count(), provinceValue: await page.locator('#province').inputValue().catch(() => null), alerts: await page.locator('[role="alert"]').allTextContents(), submitTexts: await page.locator('button[form="details-form"]').allTextContents() })}\n`);
      throw error;
    }
    assert.equal(sent.length, 0, `${name}: invalid form did not submit`);

    await page.locator('#name').fill("QA Customer");
    await page.locator('#phone').fill("03001234567");
    await page.locator('#address').fill("House 12, Street 4, Test Area");
    await page.locator('#email').fill("qa@example.test");
    for (const [province, city] of regions) {
      await page.locator('#province').selectOption(province);
      await page.locator('#city').fill(city);
      assert.equal(await page.locator('#city').inputValue(), city, `${name}: ${province} city`);
    }
    await page.getByRole("button", { name: "Other city / town" }).click();
    await page.locator('#city').fill("QA Test Town");
    if (name === "desktop") {
      await page.evaluate(() => {
        const button = document.querySelector('button[form="details-form"]');
        button?.click();
        button?.click();
      });
    } else {
      await submit.click();
    }
    await page.waitForURL(/\/order\/BNT-QA-MOCK/, { timeout: 15000 });
    assert.equal(sent.length, 1, `${name}: exactly one mocked order request`);
    assert.equal(sent[0].customer.province, "gilgit-baltistan");
    assert.equal(sent[0].customer.city, "QA Test Town");
    assert.equal(sent[0].customer.email, "qa@example.test");
    assert.equal(sent[0].items[0].quantity, 2);
    await context.close();
    process.stdout.write(`${name}: checkout form, all seven regions, manual town, and mocked success passed${name === "android" ? " with restricted checkout storage" : ""}\n`);
  }
} finally {
  await browser.close();
}
