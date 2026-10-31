import { chromium } from "playwright";

const BASE = process.argv[2] || "http://127.0.0.1:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function links(label, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1800);
  const hrefs = await page.$$eval('a[href*="/product/"]', (els) =>
    [...new Set(els.map((a) => a.getAttribute("href")).filter(Boolean))].slice(
      0,
      10,
    ),
  );
  console.log(label, JSON.stringify(hrefs));
  return hrefs;
}

await links("HOME", `${BASE}/`);
await links("PRODUCTS", `${BASE}/products`);
await browser.close();
