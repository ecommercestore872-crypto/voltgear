/**
 * Local visual audit for redesign/storefront-production-polish.
 * Captures 390 / 768 / 1440 screenshots across key commerce routes.
 *
 * Usage: node scripts/playwright-redesign-visual-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const OUT = path.resolve("docs/audit/redesign-2026-11-01");

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const ROUTES = [
  { id: "home", path: "/" },
  { id: "products", path: "/products" },
  { id: "category-earbuds", path: "/products/earbuds" },
  { id: "category-smartwatch", path: "/products/smartwatch" },
  { id: "cart", path: "/cart" },
  { id: "checkout", path: "/checkout" },
  { id: "contact", path: "/contact" },
  { id: "about", path: "/about" },
  { id: "shipping-returns", path: "/shipping-returns" },
  { id: "warranty", path: "/warranty" },
  { id: "track", path: "/track" },
];

fs.mkdirSync(OUT, { recursive: true });

const findings = {
  base: BASE,
  startedAt: new Date().toISOString(),
  consoleErrors: [],
  failedRequests: [],
  pages: [],
  productSlugs: [],
};

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(900);
}

async function shot(page, vp, id, note = "") {
  const file = path.join(OUT, `${vp}-${id}${note ? `-${note}` : ""}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function discoverProductSlugs(page) {
  await page.goto(`${BASE}/products`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(page);
  const hrefs = await page.$$eval('a[href^="/product/"]', (els) =>
    [...new Set(els.map((a) => a.getAttribute("href")).filter(Boolean))].slice(0, 5),
  );
  return hrefs.map((h) => h.replace(/^\/product\//, "").split("?")[0]).filter(Boolean);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      findings.consoleErrors.push(msg.text().slice(0, 400));
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("_next/static")) {
      findings.failedRequests.push(`${res.status()} ${res.url()}`.slice(0, 300));
    }
  });

  // Warm + discover PDPs
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    findings.productSlugs = await discoverProductSlugs(page);
  } catch (e) {
    findings.productSlugs = [];
    findings.pages.push({ id: "discover-products", error: String(e) });
  }

  const dynamicRoutes = [
    ...ROUTES,
    ...findings.productSlugs.slice(0, 3).map((slug, i) => ({
      id: `pdp-${i + 1}`,
      path: `/product/${slug}`,
    })),
  ];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const route of dynamicRoutes) {
      const entry = { viewport: vp.name, id: route.id, path: route.path };
      try {
        const res = await page.goto(`${BASE}${route.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        await settle(page);
        entry.status = res?.status() ?? null;
        entry.file = await shot(page, vp.name, route.id);

        // Mobile-only: open nav on home
        if (vp.name === "mobile" && route.id === "home") {
          const menuBtn = page.locator('button[aria-label*="menu" i], button[aria-label*="Menu" i], button[aria-label="Open menu"]').first();
          if (await menuBtn.count()) {
            await menuBtn.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(500);
            entry.menuFile = await shot(page, vp.name, "home", "nav-open");
            await page.keyboard.press("Escape").catch(() => {});
          }
        }

        // Empty cart already captured via /cart; try add-to-cart on first PDP mobile
        if (vp.name === "mobile" && route.id === "pdp-1") {
          const addBtn = page.locator('button:has-text("Add to cart"), button:has-text("Order with COD")').first();
          if (await addBtn.count()) {
            await addBtn.click({ timeout: 4000 }).catch(() => {});
            await page.waitForTimeout(800);
            entry.afterAddFile = await shot(page, vp.name, "pdp-1", "after-add");
            await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
            await settle(page);
            entry.cartFilledFile = await shot(page, vp.name, "cart", "filled");
            await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
            await settle(page);
            entry.checkoutFilledFile = await shot(page, vp.name, "checkout", "filled");
          }
        }

        findings.pages.push(entry);
        console.log(`OK ${vp.name} ${route.path} -> ${entry.file}`);
      } catch (err) {
        entry.error = String(err);
        findings.pages.push(entry);
        console.error(`FAIL ${vp.name} ${route.path}`, err);
      }
    }
  }

  findings.finishedAt = new Date().toISOString();
  findings.consoleErrors = [...new Set(findings.consoleErrors)].slice(0, 40);
  findings.failedRequests = [...new Set(findings.failedRequests)].slice(0, 40);

  const reportPath = path.join(OUT, "audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2));
  console.log(`\nReport: ${reportPath}`);
  console.log(`Screenshots: ${OUT}`);
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
