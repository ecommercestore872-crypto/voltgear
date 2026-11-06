/** Read-only image request audit for an isolated local storefront preview. */
import fs from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:3003";
const productPath = "/product/kalobee-gt8-buds-2-in-1-smartwatch";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
      deviceScaleFactor: width === 390 ? 2 : 1,
    });
    await context.addInitScript(() => localStorage.setItem("bnt-cookie-consent", "essential"));
    await context.route("**/*", (route) => {
      const request = route.request();
      const { hostname } = new URL(request.url());
      if (!["GET", "HEAD"].includes(request.method()) ||
          !["127.0.0.1", "localhost", "res.cloudinary.com"].includes(hostname)) {
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    const images = [];
    page.on("response", async (response) => {
      if (response.request().resourceType() !== "image") return;
      let bytes = null;
      try { bytes = (await response.body()).byteLength; } catch { /* cancelled image */ }
      images.push({ url: response.url(), status: response.status(), bytes });
    });
    const response = await page.goto(base + productPath, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(2500);
    results.push({
      width,
      status: response?.status() ?? null,
      mainImage: await page.locator('[role="img"][aria-label] img').first().evaluate((img) => img.currentSrc).catch(() => null),
      imageRequests: images,
      requestCount: images.length,
      bodyBytes: images.reduce((sum, image) => sum + (image.bytes ?? 0), 0),
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const report = { base, productPath, results };
fs.mkdirSync("tmp/image-qa", { recursive: true });
fs.writeFileSync("tmp/image-qa/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
