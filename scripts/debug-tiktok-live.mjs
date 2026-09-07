import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const reqs = [];
const pixelBodies = [];
page.on("request", (r) => {
  const u = r.url();
  if (u.includes("analytics.tiktok.com")) reqs.push(u.slice(0, 140));
  if (u.includes("/api/v2/pixel")) {
    pixelBodies.push(r.postData() || "");
  }
});

await page.goto("https://buyntryy.com/products", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.evaluate(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
  window.dispatchEvent(
    new CustomEvent("bnt-cookie-consent-change", { detail: "all" })
  );
});
await page.waitForTimeout(3000);
const href = await page.evaluate(
  () => document.querySelector('a[href*="/product/"]')?.href || null
);
console.log("product", href);
await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
  window.dispatchEvent(
    new CustomEvent("bnt-cookie-consent-change", { detail: "all" })
  );
});
await page.waitForTimeout(5000);
const state = await page.evaluate(() => ({
  ttq: typeof window.ttq,
  ttqTrack: typeof window.ttq?.track,
  consent: localStorage.getItem("bnt-cookie-consent"),
  hasScript: !!document.getElementById("tiktok-pixel-base"),
  htmlHasViewContent: document.documentElement.innerHTML.includes("ViewContent"),
  htmlHasTrackTikTok: document.documentElement.innerHTML.includes("trackTikTok"),
}));
console.log(JSON.stringify({ state, reqs: [...new Set(reqs)].slice(0, 10), bodyCount: pixelBodies.length, sampleBody: pixelBodies[0]?.slice(0, 300) }, null, 2));

// Try click wishlist and add to cart, capture bodies
const before = pixelBodies.length;
const wish = page.locator('button[aria-label*="wishlist" i]').first();
if (await wish.count()) {
  await wish.click();
  await page.waitForTimeout(2000);
}
const add = page.locator('button:has-text("Add to Cart")').first();
if (await add.count()) {
  await add.click({ force: true });
  await page.waitForTimeout(2000);
}
console.log(
  JSON.stringify(
    {
      newBodies: pixelBodies.slice(before).map((b) => {
        try {
          return JSON.parse(b).event;
        } catch {
          return b.slice(0, 80);
        }
      }),
    },
    null,
    2
  )
);
await browser.close();
