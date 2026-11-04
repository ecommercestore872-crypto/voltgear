/** Read-only local lab measurements; these are not field Core Web Vitals. */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:3002";
const output = process.argv[2];
const cases = [
  { name: "home-mobile", path: "/", width: 390, height: 844 },
  { name: "product-mobile", path: "/product/kalobee-gt8-buds-2-in-1-smartwatch", width: 390, height: 844 },
  { name: "home-desktop", path: "/", width: 1440, height: 900 },
  { name: "product-desktop", path: "/product/kalobee-gt8-buds-2-in-1-smartwatch", width: 1440, height: 900 },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { base, conditions: "fresh context, 1x CPU, unthrottled local network, development server", results: [] };

try {
  for (const item of cases) {
    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: 1,
      isMobile: item.width <= 430,
      hasTouch: item.width <= 430,
    });
    await context.addInitScript(() => {
      localStorage.setItem("bnt-cookie-consent", "essential");
      window.__bntPerf = { lcp: null, cls: 0, fcp: null };
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) window.__bntPerf.lcp = entries.at(-1).startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__bntPerf.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((list) => {
        const entry = list.getEntries().find((entry) => entry.name === "first-contentful-paint");
        if (entry) window.__bntPerf.fcp = entry.startTime;
      }).observe({ type: "paint", buffered: true });
    });
    await context.route("**/*", async (route) => {
      if (!["GET", "HEAD"].includes(route.request().method())) return route.abort();
      const { hostname } = new URL(route.request().url());
      if (!["127.0.0.1", "localhost", "res.cloudinary.com"].includes(hostname)) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const response = await page.goto(base + item.path, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(3000);
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        ...window.__bntPerf,
        ttfb: nav?.responseStart ?? null,
        domContentLoaded: nav?.domContentLoadedEventEnd ?? null,
        load: nav?.loadEventEnd ?? null,
        resources: performance.getEntriesByType("resource").length,
        lcpElement: document.querySelector("[data-lcp]")?.tagName ?? null,
      };
    });
    report.results.push({ ...item, status: response?.status() ?? null, ...metrics });
    await context.close();
  }
} finally {
  await browser.close();
  if (output) await writeFile(output, JSON.stringify(report, null, 2));
}

console.log(JSON.stringify(report, null, 2));
