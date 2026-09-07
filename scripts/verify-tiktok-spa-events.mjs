/**
 * Observational: decode TikTok pixel API payloads during SPA navigations.
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE || "https://buyntryy.com";

function eventNamesFromBody(body) {
  const names = [];
  if (!body) return names;
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // querystring / form style
    if (/PageView|ViewContent|AddToCart|InitiateCheckout|Purchase/i.test(body)) {
      const m = body.match(/PageView|ViewContent|AddToCart|InitiateCheckout|Purchase/gi);
      return [...new Set(m || [])];
    }
    return names;
  }
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (typeof o.event === "string") names.push(o.event);
    if (typeof o.event_name === "string") names.push(o.event_name);
    if (typeof o.type === "string" && /page|track/i.test(o.type)) names.push(o.type);
    if (Array.isArray(o)) o.forEach(walk);
    else Object.values(o).forEach(walk);
  };
  walk(parsed);
  return [...new Set(names)];
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const events = [];

page.on("request", (req) => {
  const u = req.url();
  if (!u.includes("analytics.tiktok.com/api/v2/pixel")) return;
  const body = req.postData() || "";
  events.push({
    t: Date.now(),
    method: req.method(),
    names: eventNamesFromBody(body),
    bodySnippet: body.slice(0, 500),
  });
});

await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
  window.dispatchEvent(
    new CustomEvent("bnt-cookie-consent-change", { detail: "all" })
  );
});
await page.waitForTimeout(4000);
const afterLoad = events.length;
const report = { afterInitialLoad: afterLoad, navigations: [] };

for (const href of ["/products", "/contact", "/faq"]) {
  const before = events.length;
  const nav = page.locator(`a[href="${href}"]`).first();
  if ((await nav.count()) > 0) {
    await Promise.all([
      page
        .waitForURL((u) => u.pathname.startsWith(href), { timeout: 15000 })
        .catch(() => null),
      nav.click({ force: true }),
    ]);
  } else {
    await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
  }
  await page.waitForTimeout(2500);
  const slice = events.slice(before);
  report.navigations.push({
    href,
    newRequests: slice.length,
    names: slice.flatMap((e) => e.names),
    snippets: slice.map((e) => e.bodySnippet),
  });
}

report.total = events.length;
report.allNames = events.flatMap((e) => e.names);
console.log(JSON.stringify(report, null, 2));
await browser.close();
