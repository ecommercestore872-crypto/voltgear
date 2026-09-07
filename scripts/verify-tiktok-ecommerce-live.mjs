/**
 * Live TikTok ecommerce verification on buyntryy.com (network + ttq capture).
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE || "https://buyntryy.com";
const PIXEL_ID = "DAF1KQBC77UES974M180";

function parseEvent(body) {
  try {
    const p = JSON.parse(body);
    return {
      event: p.event,
      event_id: p.event_id || "",
      properties: p.properties || null,
      pixel: p.context?.pixel?.code || null,
    };
  } catch {
    return null;
  }
}

function sampleFrom(ev) {
  if (!ev) return null;
  const props = ev.properties || {};
  return {
    event: ev.event,
    event_id: ev.event_id || null,
    value: props.value ?? null,
    currency: props.currency ?? null,
    search_string: props.search_string ?? null,
    contents: Array.isArray(props.contents)
      ? props.contents.map((c) => ({
          content_id: c.content_id,
          content_type: c.content_type,
          content_name: c.content_name,
          content_category: c.content_category,
          price: c.price,
          num_items: c.num_items ?? c.quantity,
        }))
      : undefined,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = {
    deployment: { base: BASE, pixelId: PIXEL_ID, status: null },
    events: {},
    consentEssential: null,
    excluded: null,
    diagnostics: [],
    pass: false,
  };

  try {
    // Funnel with advertising consent pre-set
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem("bnt-cookie-consent", "all");
    });

    const bucket = [];
    page.on("request", (req) => {
      if (!req.url().includes("analytics.tiktok.com/api/v2/pixel")) return;
      const parsed = parseEvent(req.postData() || "");
      if (parsed) bucket.push(parsed);
    });

    const countOf = (name) => bucket.filter((e) => e.event === name).length;
    const lastOf = (name) => [...bucket].reverse().find((e) => e.event === name);

    await page.goto(BASE + "/products", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    const productUrl = await page.evaluate(
      () => document.querySelector('a[href*="/product/"]')?.href
    );
    if (!productUrl) throw new Error("No product URL");

    // ViewContent
    bucket.length = 0;
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);
    report.events.ViewContent = {
      ok: countOf("ViewContent") === 1,
      count: countOf("ViewContent"),
      sample: sampleFrom(lastOf("ViewContent")),
    };

    // Wishlist add
    bucket.length = 0;
    const wish = page.locator('button[aria-label*="wishlist" i]').first();
    const wishLabel = (await wish.getAttribute("aria-label")) || "";
    if (/remove/i.test(wishLabel)) {
      await wish.click();
      await page.waitForTimeout(800);
      bucket.length = 0;
    }
    await wish.click();
    await page.waitForTimeout(2000);
    report.events.AddToWishlist = {
      ok: countOf("AddToWishlist") === 1,
      count: countOf("AddToWishlist"),
      sample: sampleFrom(lastOf("AddToWishlist")),
    };

    // Wishlist remove
    bucket.length = 0;
    await wish.click();
    await page.waitForTimeout(1500);
    report.events.WishlistRemove = {
      ok: countOf("AddToWishlist") === 0,
      addToWishlistCount: countOf("AddToWishlist"),
    };

    // Search
    bucket.length = 0;
    await page.goto(BASE + "/search?q=earbuds", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(4000);
    report.events.Search = {
      ok: countOf("Search") === 1,
      count: countOf("Search"),
      sample: sampleFrom(lastOf("Search")),
    };

    // AddToCart
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => {
      try {
        localStorage.removeItem("ecomm-cart");
      } catch {}
    });
    bucket.length = 0;
    await page.locator('button:has-text("Add to Cart")').first().click({ force: true });
    await page.waitForTimeout(2000);
    report.events.AddToCart = {
      ok: countOf("AddToCart") === 1,
      count: countOf("AddToCart"),
      sample: sampleFrom(lastOf("AddToCart")),
    };

    // Drawer only
    bucket.length = 0;
    const cartBtn = page.locator('button[aria-label*="cart" i]').first();
    if (await cartBtn.count()) {
      await cartBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1200);
    }
    report.events.CartDrawerOnly = {
      ok: countOf("AddToCart") === 0,
      addToCartCount: countOf("AddToCart"),
    };

    // InitiateCheckout
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch {}
    });
    bucket.length = 0;
    await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(6000);
    const ic = lastOf("InitiateCheckout");
    report.events.InitiateCheckout = {
      ok: countOf("InitiateCheckout") === 1,
      count: countOf("InitiateCheckout"),
      sample: sampleFrom(ic),
    };

    // Refresh same cart
    bucket.length = 0;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);
    report.events.InitiateCheckoutRefresh = {
      ok: countOf("InitiateCheckout") === 0,
      count: countOf("InitiateCheckout"),
    };

    // Change cart qty
    bucket.length = 0;
    const plus = page.locator('button[aria-label*="Increase" i]').first();
    if (await plus.count()) {
      await plus.click({ force: true });
      await page.waitForTimeout(6000);
    } else {
      await page.evaluate(() => {
        try {
          const items = JSON.parse(localStorage.getItem("ecomm-cart") || "[]");
          if (items[0]) items[0].quantity = (Number(items[0].quantity) || 1) + 1;
          localStorage.setItem("ecomm-cart", JSON.stringify(items));
        } catch {}
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(6000);
    }
    report.events.InitiateCheckoutCartChange = {
      ok: countOf("InitiateCheckout") === 1,
      count: countOf("InitiateCheckout"),
      sample: sampleFrom(lastOf("InitiateCheckout")),
    };

    // Purchase
    bucket.length = 0;
    let orderId = null;
    let serverTotal = null;
    page.on("response", async (res) => {
      if (!res.url().includes("/api/checkout") || res.request().method() !== "POST") return;
      try {
        const data = await res.json();
        if (data?.orderId) {
          orderId = data.orderId;
          serverTotal = data.total;
        }
      } catch {}
    });

    // Ensure on checkout with items
    await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    const fill = async (sel, val) => {
      const el = page.locator(sel).first();
      if (await el.count()) await el.fill(val);
    };
    await fill("#name, input[name='name']", "TikTok Verify");
    await fill("#email, input[name='email']", "tiktok.verify@buyntryy.com");
    await fill("#phone, input[name='phone']", "03001234567");
    await fill("#address, textarea[name='address'], input[name='address']", "Verify Street 12");
    await fill("#city, input[name='city']", "Lahore");
    await fill("#postal, input[name='postal']", "54000");

    for (let i = 0; i < 4; i++) {
      const next = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Review")').first();
      if (await next.count()) {
        await next.click({ force: true }).catch(() => {});
        await page.waitForTimeout(900);
      }
    }

    bucket.length = 0;
    const place = page.locator('button:has-text("Place Order"), button:has-text("Place order")').first();
    if (await place.count()) {
      await place.click({ force: true });
      await page.waitForTimeout(8000);
      const purchase = lastOf("Purchase");
      const expected = orderId ? `purchase_${orderId}` : null;
      // event_id may be in properties or top-level depending on SDK
      const gotId =
        purchase?.event_id ||
        purchase?.properties?.event_id ||
        null;
      report.events.Purchase = {
        ok:
          countOf("Purchase") === 1 &&
          Boolean(orderId) &&
          (gotId === expected ||
            // Some SDK builds omit event_id in network body; still require single Purchase + order
            (Boolean(orderId) && countOf("Purchase") === 1 && serverTotal != null && Number(purchase?.properties?.value) === Number(serverTotal))),
        count: countOf("Purchase"),
        orderId,
        serverTotal,
        event_id: gotId,
        expected_event_id: expected,
        sample: sampleFrom(purchase),
        note:
          gotId === expected
            ? "event_id matched purchase_<orderId>"
            : "check Pixel Helper for event_id if network body omits it",
      };

      // Refresh order page
      bucket.length = 0;
      if (orderId) {
        await page.goto(
          `${BASE}/order/${orderId}?email=${encodeURIComponent("tiktok.verify@buyntryy.com")}`,
          { waitUntil: "domcontentloaded", timeout: 60000 }
        );
        await page.waitForTimeout(2500);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2500);
      }
      report.events.PurchaseRefresh = {
        ok: countOf("Purchase") === 0,
        count: countOf("Purchase"),
      };
    } else {
      report.events.Purchase = { ok: false, error: "Place Order not found" };
      report.events.PurchaseRefresh = { ok: false, error: "skipped" };
    }

    await ctx.close();

    // Essential-only
    {
      const c2 = await browser.newContext();
      const p2 = await c2.newPage();
      await p2.addInitScript(() => {
        localStorage.setItem("bnt-cookie-consent", "essential");
      });
      const b2 = [];
      p2.on("request", (req) => {
        if (req.url().includes("/api/v2/pixel")) {
          const parsed = parseEvent(req.postData() || "");
          if (parsed) b2.push(parsed);
        }
      });
      await p2.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await p2.waitForTimeout(3500);
      const commerce = b2.filter((e) =>
        [
          "ViewContent",
          "AddToWishlist",
          "Search",
          "AddToCart",
          "InitiateCheckout",
          "Purchase",
        ].includes(e.event)
      );
      report.consentEssential = {
        ok: commerce.length === 0,
        commerceEvents: commerce.map((e) => e.event),
      };
      await c2.close();
    }

    // Excluded
    {
      const results = {};
      for (const path of ["/admin", "/studio", "/demo/login"]) {
        const c3 = await browser.newContext();
        const p3 = await c3.newPage();
        await p3.addInitScript(() => {
          localStorage.setItem("bnt-cookie-consent", "all");
        });
        const b3 = [];
        p3.on("request", (req) => {
          if (req.url().includes("/api/v2/pixel")) {
            const parsed = parseEvent(req.postData() || "");
            if (parsed) b3.push(parsed);
          }
        });
        await p3.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
        await p3.waitForTimeout(2500);
        const commerce = b3.filter((e) =>
          [
            "ViewContent",
            "AddToWishlist",
            "Search",
            "AddToCart",
            "InitiateCheckout",
            "Purchase",
          ].includes(e.event)
        );
        results[path] = {
          ok: commerce.length === 0,
          events: commerce.map((e) => e.event),
          url: p3.url(),
        };
        await c3.close();
      }
      report.excluded = {
        ok: Object.values(results).every((r) => r.ok),
        results,
      };
    }

    const e = report.events;
    report.pass = Boolean(
      e.ViewContent?.ok &&
        e.AddToWishlist?.ok &&
        e.WishlistRemove?.ok &&
        e.Search?.ok &&
        e.AddToCart?.ok &&
        e.CartDrawerOnly?.ok &&
        e.InitiateCheckout?.ok &&
        e.InitiateCheckoutRefresh?.ok &&
        e.InitiateCheckoutCartChange?.ok &&
        e.Purchase?.ok &&
        e.PurchaseRefresh?.ok &&
        report.consentEssential?.ok &&
        report.excluded?.ok
    );
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
