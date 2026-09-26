/**
 * Browser smoke on production shop (Playwright).
 *   npx playwright install chromium
 *   npx tsx scripts/playwright-production-health.ts
 */
import { chromium } from "playwright";

const SHOP = (process.env.SHOP_URL || "https://buyntryy.com").replace(/\/$/, "");

async function auditPage(
  label: string,
  path: string,
  viewport: { width: number; height: number },
) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const consoleErrors: string[] = [];
  const failed: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && u.startsWith(SHOP)) {
      failed.push(`${res.status()} ${u}`);
    }
  });

  const t0 = Date.now();
  const res = await page.goto(`${SHOP}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  const ms = Date.now() - t0;
  const status = res?.status() ?? 0;

  await browser.close();

  return { label, path, status, ms, consoleErrors, failed };
}

async function main() {
  const paths = ["/", "/products", "/checkout", "/contact"];
  const results = [];
  for (const p of paths) {
    results.push(await auditPage("desktop", p, { width: 1280, height: 800 }));
  }
  results.push(await auditPage("mobile", "/", { width: 390, height: 844 }));

  let bad = 0;
  for (const r of results) {
    const ok = r.status === 200 && r.failed.length === 0;
    if (!ok) bad += 1;
    console.log(
      `${ok ? "ok" : "FAIL"}  ${r.label} ${r.path} status=${r.status} ${r.ms}ms failedReq=${r.failed.length} consoleErr=${r.consoleErrors.length}`,
    );
    if (r.failed.length) r.failed.slice(0, 5).forEach((f) => console.log(`      ${f}`));
    if (r.consoleErrors.length)
      r.consoleErrors.slice(0, 3).forEach((e) => console.log(`      console: ${e.slice(0, 120)}`));
  }

  if (bad) process.exit(1);
  console.log("\nPlaywright production smoke passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
