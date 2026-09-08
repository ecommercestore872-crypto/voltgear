import { chromium } from "playwright";

const BASE = "https://buyntryy.com";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.addInitScript(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
});

await page.goto(BASE + "/products", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
const productUrl = await page.evaluate(
  () => document.querySelector('a[href*="/product/"]')?.href
);
await page.goto(productUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.locator('button:has-text("Add to Cart")').first().click({ force: true });
await page.waitForTimeout(1500);
await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const buttons = await page.evaluate(() =>
  [...document.querySelectorAll("button")]
    .map((b) => (b.innerText || b.textContent || "").trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 40)
);
console.log("buttons", buttons);

// try step progression
for (const label of ["Continue to information", "Continue", "Next", "Review order", "Place Order", "Confirm order"]) {
  const btn = page.locator(`button:has-text("${label}")`).first();
  if (await btn.count()) {
    console.log("clicking", label);
    await btn.click({ force: true }).catch((e) => console.log("fail", e.message));
    await page.waitForTimeout(1000);
  }
}

const buttons2 = await page.evaluate(() =>
  [...document.querySelectorAll("button")]
    .map((b) => (b.innerText || b.textContent || "").trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 40)
);
console.log("buttons after", buttons2);
console.log("url", page.url());
await page.screenshot({ path: "scripts/checkout-debug.png", fullPage: true });
await browser.close();
