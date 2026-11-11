import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.STOREFRONT_TEST_BASE_URL ?? "http://localhost:3043";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) {
  throw new Error("Storefront journey test only supports a local server.");
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(() => localStorage.setItem("bnt-cookie-consent", "essential"));
  const page = await context.newPage();
  await page.route("**/api/checkout", (route) => route.abort());
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  assert.equal((await page.title()).length > 0, true, "homepage title");
  await page.goto(`${base}/products`, { waitUntil: "domcontentloaded" });
  assert.equal((await page.title()).length > 0, true, "catalog title");
  await page.goto(`${base}/product/buds-pro-16`, { waitUntil: "domcontentloaded" });
  const add = page.locator("button.gadget-buy-cta:visible").first();
  await add.waitFor({ timeout: 30000 });
  assert.equal(await add.isEnabled(), true, "product is addable");
  await add.click();
  await page.waitForFunction(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("ecomm-cart") ?? "[]");
      return cart.some((item) => item.slug === "buds-pro-16" && item.quantity >= 1);
    } catch { return false; }
  }, null, { timeout: 15000 });
  await page.goto(`${base}/checkout`, { waitUntil: "domcontentloaded" });
  await page.locator("h2", { hasText: "Your delivery details" }).waitFor({ timeout: 15000 });
  assert.equal(await page.getByText("Your cart is empty").count(), 0, "cart reached checkout");
  process.stdout.write("homepage → catalog → product → cart → checkout passed locally\n");
  await context.close();
} finally {
  await browser.close();
}
