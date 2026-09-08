import { chromium } from "playwright";

const BASE = "https://buyntryy.com";

function contentId(ev) {
  return ev?.properties?.contents?.[0]?.content_id || null;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 900 } })
  ).newPage();
  await page.addInitScript(() => localStorage.setItem("bnt-cookie-consent", "all"));

  const bucket = [];
  page.on("request", (req) => {
    if (!req.url().includes("analytics.tiktok.com/api/v2/pixel")) return;
    try {
      const p = JSON.parse(req.postData() || "{}");
      if (p.event) bucket.push(p);
    } catch {
      /* ignore */
    }
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.setItem(
      "ecomm-cart",
      JSON.stringify([
        {
          slug: "rgb-led-3d-56-ring-light",
          name: "RGB LED 3D 56 Ring Light",
          price: 11499,
          quantity: 1,
          sku: "VG-RL-3D56",
          variantKey: "blk",
          variantName: "Black",
          variantSku: "VG-RL-3D56-BLK",
        },
      ])
    );
  });

  bucket.length = 0;
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const checkout = bucket.filter((e) => e.event === "InitiateCheckout").at(-1);

  const report = {
    catalogVariants: 0,
    method:
      "Injected cart line with sku + variantSku (live catalog has zero product_variants)",
    InitiateCheckout_content_id: contentId(checkout),
    expected: "VG-RL-3D56-BLK",
    currency: checkout?.properties?.currency || null,
    ok: contentId(checkout) === "VG-RL-3D56-BLK",
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
