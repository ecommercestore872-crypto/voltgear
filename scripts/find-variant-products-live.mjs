import { chromium } from "playwright";

const BASE = "https://buyntryy.com";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.addInitScript(() => localStorage.setItem("bnt-cookie-consent", "all"));

  await page.goto(`${BASE}/sitemap.xml`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const xml = await page.content();
  const urls = [...xml.matchAll(/https:\/\/buyntryy\.com\/product\/[^<\s"]+/g)].map((m) => m[0]);
  console.log("sitemap products", urls.length);

  const hits = [];
  for (const href of urls) {
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => {
      const optCount = document.querySelectorAll("#gadget-buy-options button").length;
      const fieldsets = [...document.querySelectorAll("fieldset")].map((f) =>
        (f.getAttribute("aria-label") || f.textContent || "").slice(0, 80)
      );
      const buyText = [...document.querySelectorAll("button.gadget-btn-primary")]
        .map((b) => (b.innerText || "").trim())
        .join("|");
      return { optCount, fieldsets, buyText, path: location.pathname };
    });
    if (info.optCount > 0 || /choose options/i.test(info.buyText)) {
      hits.push({ href, ...info });
      console.log("VARIANT UI", JSON.stringify(hits[hits.length - 1]));
    }
  }
  console.log(JSON.stringify({ hitCount: hits.length, hits }, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
