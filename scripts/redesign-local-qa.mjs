/** Local, read-only visual acceptance for the Buy N Try redesign. */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const base = "http://127.0.0.1:3002";
const output = process.argv[2] || path.resolve("redesign-screenshots");
const widths = process.argv[3]
  ? process.argv[3].split(",").map(Number).filter((width) => Number.isInteger(width) && width > 0)
  : [375, 390, 430, 768, 1024, 1440];
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { base, pages: [], interactions: {}, consoleErrors: [] };

try {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width <= 430 ? 844 : 900 },
      deviceScaleFactor: 1,
      isMobile: width <= 430,
      hasTouch: width <= 430,
    });
    await context.addInitScript(() => {
      localStorage.setItem("bnt-cookie-consent", "essential");
    });
    await context.route("**/*", async (route) => {
      const method = route.request().method();
      if (method !== "GET" && method !== "HEAD") return route.abort();
      const url = new URL(route.request().url());
      if (!["127.0.0.1", "localhost", "res.cloudinary.com"].includes(url.hostname)) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") report.consoleErrors.push({ width, path: new URL(page.url()).pathname, text: message.text().slice(0, 4000) });
    });
    page.on("pageerror", (error) => report.consoleErrors.push({ width, path: new URL(page.url()).pathname, text: error.message.slice(0, 4000) }));

    async function capture(name, url = null) {
      if (url) await page.goto(base + url, { waitUntil: "domcontentloaded", timeout: 120000 });
      if (name === "home") {
        await page.locator("#best-sellers-heading").waitFor({ state: "visible", timeout: 30000 }).catch(() => null);
      }
      if (name === "cart-filled") {
        await page.getByRole("heading", { name: "Shopping cart" }).waitFor({ state: "visible", timeout: 30000 }).catch(() => null);
      }
      if (name === "cart-empty") {
        await page.getByRole("heading", { name: "Your cart is empty" }).waitFor({ state: "visible", timeout: 30000 }).catch(() => null);
      }
      if (name === "checkout") {
        await page.locator("#city").waitFor({ state: "visible", timeout: 30000 }).catch(() => null);
      }
      if (name === "product") {
        await page.locator('button[aria-label^="View image "]').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
      }
      await page.waitForTimeout(900);
      if (["home", "catalog", "product", "checkout"].includes(name)) {
        await page.evaluate(async () => {
          const step = Math.max(400, innerHeight - 100);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((resolve) => setTimeout(resolve, 120));
          }
          scrollTo(0, 0);
        });
        await page.waitForFunction(() => [...document.images].filter((image) => image.loading === "lazy" && image.getBoundingClientRect().width > 0).every((image) => image.complete), undefined, { timeout: 10000 }).catch(() => null);
      }
      if (name === "home") {
        await page.evaluate(async () => {
          for (const selector of ['[aria-label="Lifestyle shop"]', '#gadget-blogs-heading']) {
            const section = document.querySelector(selector)?.closest('section');
            if (!section) continue;
            section.scrollIntoView();
            await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 150)));
            await Promise.race([
              Promise.all([...section.querySelectorAll('img')].map((img) => img.decode().catch(() => null))),
              new Promise((resolve) => setTimeout(resolve, 4000)),
            ]);
          }
          scrollTo(0, 0);
        });
      }
      if (name === "home") {
        await page.getByRole("button", { name: "Go to slide 1" }).click();
        await page.locator('[aria-roledescription="carousel"]').focus();
      }
      const info = await page.evaluate(() => ({
        path: location.pathname,
        h1: [...document.querySelectorAll("h1")].map((element) => element.textContent?.trim()),
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        brokenImages: [...document.images].filter((image) => image.complete && !image.naturalWidth).map((image) => image.src),
      }));
      const file = path.join(output, `${name}-${width}.png`);
      await page.screenshot({ path: file, animations: "disabled", caret: "initial", fullPage: ["home", "catalog", "product", "cart-empty", "cart-filled", "checkout"].includes(name) });
      report.pages.push({ name, width, file, ...info });
    }

    await capture("home", "/");
    const dots = page.getByRole("button", { name: /Go to slide \d+/ });
    const slideCount = await dots.count();
    for (let i = 0; i < slideCount; i++) {
      await dots.nth(i).click();
      await capture(`hero-${i + 1}`);
    }
    if (slideCount > 1) {
      await page.getByRole("button", { name: "Next slide" }).click();
      report.interactions[`carouselNext-${width}`] = await page.locator('[aria-roledescription="carousel"] h1').textContent();
      await page.locator('[aria-roledescription="carousel"]').focus();
      await page.keyboard.press("ArrowLeft");
      report.interactions[`carouselKeyboard-${width}`] = await page.locator('[aria-roledescription="carousel"] h1').textContent();
    }

    if (width === 390) {
      report.interactions.mobileNav = await page.locator('[aria-label="Mobile primary"] a').allTextContents();
      await capture("mobile-navigation");
    }

    await capture("catalog", "/products");
    if (width === 1440) {
      const card = page.locator('article a[href^="/product/"]').first();
      if (await card.count()) {
        await card.hover();
        await page.screenshot({ path: path.join(output, "product-hover-1440.png"), animations: "disabled", caret: "initial" });
      }
    }
    const preferredProductHref = "/product/kalobee-gt8-buds-2-in-1-smartwatch";
    const productHref = await page.locator(`article a[href="${preferredProductHref}"]`).count()
      ? preferredProductHref
      : await page.locator('article a[href^="/product/"]').first().getAttribute("href").catch(() => null);
    if (productHref) {
      await capture("product", productHref);
      report.interactions.productHref = productHref;
    }
    await capture("cart-empty", "/cart");
    report.interactions[`cart-${width}`] = "not exercised: direct cart interaction blocked by auto-review";
    await capture("checkout", "/checkout?from=gadget");
    report.interactions[`checkoutHeadings-${width}`] = await page.locator("h1").allTextContents();
    const city = page.locator("#city");
    if (await city.count()) {
      await page.locator("#province").selectOption("PB");
      await city.fill("Kot Addu");
      await city.blur();
      report.interactions[`city-${width}`] = { type: await city.getAttribute("type"), value: await city.inputValue(), invalid: await city.getAttribute("aria-invalid") };
    }
    if (width === 390) {
      await capture("search", "/search");
      await capture("category", "/products/earbuds");
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
}

console.log(JSON.stringify({ screenshots: report.pages.length, interactions: report.interactions, overflow: report.pages.filter((page) => page.overflow), brokenImages: report.pages.filter((page) => page.brokenImages.length), consoleErrors: report.consoleErrors.slice(0, 8) }, null, 2));
