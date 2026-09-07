import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const events = [];
page.on("request", (r) => {
  if (!r.url().includes("/api/v2/pixel")) return;
  const body = r.postData() || "";
  try {
    const parsed = JSON.parse(body);
    events.push({
      event: parsed.event,
      event_id: parsed.event_id,
      props: parsed.properties || null,
      raw: body.slice(0, 800),
    });
  } catch {
    events.push({ raw: body.slice(0, 200) });
  }
});

await page.addInitScript(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
});

await page.goto("https://buyntryy.com/products", {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(2000);
const href = await page.evaluate(
  () => document.querySelector('a[href*="/product/"]')?.href
);
events.length = 0;
await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
console.log(
  "after PDP",
  events.map((e) => e.event),
  events.find((e) => e.event === "ViewContent")
);

const wish = page.locator('button[aria-label*="wishlist" i]').first();
await wish.click();
await page.waitForTimeout(1500);
console.log(
  "wishlist",
  events.filter((e) => e.event === "AddToWishlist").map((e) => e.props || e.raw)
);

await page.locator('button:has-text("Add to Cart")').first().click({ force: true });
await page.waitForTimeout(1500);
console.log(
  "cart",
  events.filter((e) => e.event === "AddToCart").map((e) => e.props || e.raw)
);

await browser.close();
