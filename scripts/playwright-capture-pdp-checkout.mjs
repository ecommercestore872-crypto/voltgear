import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const OUT = path.resolve("docs/audit/redesign-2026-11-01");
fs.mkdirSync(OUT, { recursive: true });

const PDPS = [
  "/product/universal-active-stylus-pen",
  "/product/gt5-buds-smart-watch-headset-2in1-tws-wireless-hifi-earbuds",
  "/product/a-58-plus-smartwatch",
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

async function shot(name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("SHOT", file);
}

for (const vp of [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (let i = 0; i < PDPS.length; i++) {
    await page.goto(`${BASE}${PDPS[i]}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await page.waitForTimeout(1200);
    await shot(`${vp.name}-pdp-${i + 1}.png`);
  }
}

// Mobile add-to-cart → cart → checkout (mocked later)
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}${PDPS[0]}`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await page.waitForTimeout(1200);
const add = page
  .locator('button:has-text("Add to cart"), button:has-text("Order with COD")')
  .first();
if (await add.count()) {
  await add.click();
  await page.waitForTimeout(1000);
  await shot("mobile-pdp-after-add.png");
}
await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1000);
await shot("mobile-cart-filled.png");
await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await shot("mobile-checkout-filled.png");

// Validation: submit empty form if present
const place = page
  .locator('button:has-text("Place"), button:has-text("Confirm"), button[type="submit"]')
  .first();
if (await place.count()) {
  await place.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot("mobile-checkout-validation.png");
}

await browser.close();
console.log("done");
