import { chromium } from "playwright";

const BASE = "https://buyntryy.com";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.addInitScript(() => {
  localStorage.setItem("bnt-cookie-consent", "all");
});

page.on("dialog", async (d) => {
  console.log("dialog", d.message());
  await d.accept();
});

const bucket = [];
page.on("request", (req) => {
  if (!req.url().includes("/api/v2/pixel")) return;
  try {
    bucket.push(JSON.parse(req.postData() || "{}"));
  } catch {}
});

let orderId = null;
let serverTotal = null;
let lines = null;
page.on("response", async (res) => {
  if (!res.url().includes("/api/checkout") || res.request().method() !== "POST") return;
  try {
    const data = await res.json();
    console.log("checkout api", res.status(), JSON.stringify(data).slice(0, 500));
    if (data?.orderId) {
      orderId = data.orderId;
      serverTotal = data.total;
      lines = data.lines;
    }
  } catch (e) {
    console.log("checkout parse fail", e?.message);
  }
});

await page.goto(BASE + "/products", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(1500);
const productUrl = await page.evaluate(
  () => document.querySelector('a[href*="/product/"]')?.href
);
console.log("product", productUrl);
await page.goto(productUrl, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('button:has-text("Add to Cart")').first().click({ force: true });
await page.waitForTimeout(1500);

await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
console.log(
  "step0 buttons",
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean)
  )
);
await page.locator('button:has-text("Checkout")').first().click();
await page.waitForTimeout(1200);

await page.locator("#name").fill("TikTok Verify");
await page.locator("#email").fill("tiktok.verify@buyntryy.com");
await page.locator("#phone").fill("03001234567");
await page.locator("#address").fill("House 12 Verify Street Gulberg");
await page.locator("#city").fill("Lahore");
await page.locator("#postal").fill("54000");

await page.locator('button:has-text("Continue to Review")').click();
await page.waitForTimeout(2000);
console.log(
  "step2 buttons",
  await page.evaluate(() =>
    [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean)
  )
);

bucket.length = 0;
const place = page.locator('button:has-text("Place Order")');
console.log("place count", await place.count());
await place.first().click({ force: true });
await page.waitForTimeout(10000);

const purchases = bucket.filter((e) => e.event === "Purchase");
console.log(
  JSON.stringify(
    {
      orderId,
      serverTotal,
      lineCount: Array.isArray(lines) ? lines.length : null,
      purchaseCount: purchases.length,
      purchase: purchases[0]
        ? {
            event_id: purchases[0].event_id,
            value: purchases[0].properties?.value,
            currency: purchases[0].properties?.currency,
            contents: purchases[0].properties?.contents,
          }
        : null,
      expectedId: orderId ? `purchase_${orderId}` : null,
      url: page.url(),
    },
    null,
    2
  )
);

if (orderId) {
  bucket.length = 0;
  await page.goto(
    `${BASE}/order/${orderId}?email=${encodeURIComponent("tiktok.verify@buyntryy.com")}`,
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  console.log(
    JSON.stringify(
      { purchaseOnRefresh: bucket.filter((e) => e.event === "Purchase").length },
      null,
      2
    )
  );
}

await browser.close();
