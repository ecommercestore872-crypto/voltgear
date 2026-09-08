import { chromium } from "playwright";

const BASE = "https://buyntryy.com";
const START = [
  "/products",
  "/products/earbuds",
  "/products/chargers",
  "/products/cables",
  "/products/smartwatches",
  "/products/ring-lights",
  "/products/selfie-sticks",
  "/products/tripods",
  "/search?q=color",
  "/search?q=black",
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem("bnt-cookie-consent", "all"));

  const hrefs = new Set();
  for (const path of START) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(1500);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="/product/"]')].map((a) => a.href)
    );
    links.forEach((h) => hrefs.add(h));
  }
  console.log("unique products", hrefs.size);

  const hits = [];
  for (const href of [...hrefs]) {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => localStorage.setItem("ecomm-cart", "[]"));
    const info = await page.evaluate(() => {
      const optCount = document.querySelectorAll("#gadget-buy-options button").length;
      const legacy = [...document.querySelectorAll("fieldset button")].map((b) =>
        (b.innerText || "").trim()
      );
      return { optCount, legacy: legacy.slice(0, 12), path: location.pathname };
    });
    if (info.optCount > 0 || info.legacy.length > 0) {
      // try add and inspect cart
      const buy = page.locator('button.gadget-btn-primary:has-text("Buy now")').first();
      if (await buy.count()) {
        if (info.optCount > 0) {
          await page.locator("#gadget-buy-options button").first().click({ force: true }).catch(() => {});
          await page.waitForTimeout(200);
        } else if (info.legacy.length) {
          await page.locator("fieldset button").first().click({ force: true }).catch(() => {});
          await page.waitForTimeout(200);
        }
        await buy.click().catch(() => {});
        await page.waitForTimeout(800);
      }
      const cart = await page.evaluate(() => {
        try {
          return JSON.parse(localStorage.getItem("ecomm-cart") || "[]")[0] || null;
        } catch {
          return null;
        }
      });
      hits.push({ href, ...info, cart });
      console.log(
        JSON.stringify({
          slug: info.path,
          optCount: info.optCount,
          legacy: info.legacy,
          cartSku: cart?.sku,
          cartVariantSku: cart?.variantSku,
          variantKey: cart?.variantKey,
        })
      );
    }
  }
  console.log("DONE hits", hits.length);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
