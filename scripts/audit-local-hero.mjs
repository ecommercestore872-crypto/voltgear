/** Read-only visual audit against a development storefront with local catalog data. */
import fs from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] || "http://127.0.0.1:3003";
const out = "tmp/hero-qa";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];

try {
  for (const width of [390, 768, 1024, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      isMobile: width === 390,
      hasTouch: width === 390,
      deviceScaleFactor: width === 390 ? 2 : 1,
      reducedMotion: "reduce",
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
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
    const hero = page.getByRole("region", { name: "Featured collections" });
    await hero.waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const screenshot = `${out}/hero-${width}.png`;
    await hero.screenshot({ path: screenshot });
    const measures = await page.evaluate(() => {
      const hero = document.querySelector('[aria-label="Featured collections"]');
      const heading = hero?.querySelector("h1");
      const picture = hero?.querySelector("picture");
      const links = [...(hero?.querySelectorAll("a") ?? [])].filter((a) => {
        const box = a.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        visibleHeadingCount: heading && getComputedStyle(heading).clipPath === "none" ? 1 : 0,
        visibleLinks: links.length,
        heroHeight: hero?.getBoundingClientRect().height ?? 0,
        selectedImage: picture?.querySelector("img")?.currentSrc ?? hero?.querySelector("img")?.currentSrc ?? null,
        desktopSource: picture?.querySelector("source")?.srcset ?? null,
      };
    });
    results.push({ width, status: response?.status() ?? null, screenshot, ...measures, errors });
    await context.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
