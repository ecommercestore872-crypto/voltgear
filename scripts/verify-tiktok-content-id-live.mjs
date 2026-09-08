/**
 * Live TikTok content_id consistency on buyntryy.com.
 * PDP primary CTA is GadgetBuyBox "Buy now" (adds to cart).
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE || "https://buyntryy.com";

function parsePixel(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function contentIds(ev) {
  const contents = ev?.properties?.contents;
  if (!Array.isArray(contents)) return [];
  return contents.map((c) => c.content_id).filter(Boolean);
}

function sampleEvent(ev) {
  if (!ev) return null;
  return {
    event: ev.event,
    event_id: ev.event_id || null,
    value: ev.properties?.value ?? null,
    currency: ev.properties?.currency ?? null,
    content_ids: contentIds(ev),
  };
}

async function newAuthedPage(browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("bnt-cookie-consent", "all");
  });
  return { ctx, page };
}

function attachPixel(page, bucket) {
  page.on("request", (req) => {
    if (!req.url().includes("analytics.tiktok.com/api/v2/pixel")) return;
    const parsed = parsePixel(req.postData() || "");
    if (parsed?.event) bucket.push(parsed);
  });
}

async function clearCart(page) {
  if (!page.url().startsWith("http")) {
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
  await page.evaluate(() => localStorage.setItem("ecomm-cart", "[]"));
}

/** Main PDP add — GadgetBuyBox primary (desktop). */
async function clickPdpAdd(page) {
  const choose = page.locator('button.gadget-btn-primary:has-text("Choose options")').first();
  if (await choose.isVisible().catch(() => false)) {
    // Select first available option buttons in buy options
    const opts = page.locator("#gadget-buy-options button");
    const n = await opts.count();
    for (let i = 0; i < Math.min(n, 4); i++) {
      await opts.nth(i).click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }
  const buy = page.locator('button.gadget-btn-primary:has-text("Buy now")').first();
  await buy.click({ timeout: 15000 });
  await page.waitForTimeout(1500);
}

async function readCartLine(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("ecomm-cart") || "[]")[0] || null;
    } catch {
      return null;
    }
  });
}

async function listProductHrefs(page) {
  await page.goto(`${BASE}/products`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/product/"]')]
      .map((a) => a.href)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 35)
  );
}

async function probeProduct(browser, href) {
  const { ctx, page } = await newAuthedPage(browser);
  const bucket = [];
  attachPixel(page, bucket);
  await page.goto(href, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  const view = bucket.filter((e) => e.event === "ViewContent").at(-1);
  const jsonLdSku = await page.evaluate(() => {
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const j = JSON.parse(s.textContent || "");
        const nodes = Array.isArray(j) ? j : [j];
        for (const n of nodes) {
          if (n?.sku) return String(n.sku);
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });
  await clearCart(page);
  await clickPdpAdd(page);
  const cartLine = await readCartLine(page);
  await ctx.close();
  return {
    href,
    slug: href.split("/product/")[1]?.split("?")[0] || null,
    viewContentId: contentIds(view)[0] || null,
    jsonLdSku,
    cartLine,
  };
}

async function fillCheckout(page) {
  const checkoutBtn = page.locator('button:has-text("Checkout")');
  if (await checkoutBtn.count()) {
    await checkoutBtn.first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }
  if (await page.locator("#name").count()) {
    await page.locator("#name").fill("ContentId Verify");
    await page.locator("#email").fill("contentid.verify@buyntryy.com");
    await page.locator("#phone").fill("03009876543");
    await page.locator("#address").fill("House 9 ContentId Street DHA");
    await page.locator("#city").fill("Lahore");
    await page.locator("#postal").fill("54000");
    await page.locator('button:has-text("Continue to Review")').click();
    await page.waitForTimeout(2000);
  }
}

async function runSkuFunnel(browser, productUrl, expectedSku) {
  const { ctx, page } = await newAuthedPage(browser);
  const bucket = [];
  attachPixel(page, bucket);

  let orderId = null;
  let serverTotal = null;
  let serverLines = null;
  page.on("response", async (res) => {
    if (!res.url().includes("/api/checkout") || res.request().method() !== "POST") return;
    try {
      const data = await res.json();
      if (data?.orderId) {
        orderId = data.orderId;
        serverTotal = data.total;
        serverLines = data.lines;
      }
    } catch {
      /* ignore */
    }
  });

  const fpHits = [];
  page.on("request", (req) => {
    const u = req.url();
    if (
      u.includes("/api/analytics") ||
      u.includes("google-analytics.com") ||
      u.includes("googletagmanager.com") ||
      u.includes("/g/collect")
    ) {
      fpHits.push(u.split("?")[0]);
    }
  });

  await clearCart(page);
  bucket.length = 0;
  await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4500);
  const view = bucket.filter((e) => e.event === "ViewContent");

  bucket.length = 0;
  await clickPdpAdd(page);
  const add = bucket.filter((e) => e.event === "AddToCart");
  const cartBefore = await page.evaluate(() => localStorage.getItem("ecomm-cart"));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const cartAfter = await page.evaluate(() => localStorage.getItem("ecomm-cart"));
  const hydrated = (() => {
    try {
      const a = JSON.parse(cartBefore || "[]");
      const b = JSON.parse(cartAfter || "[]");
      return (
        a.length === b.length &&
        a[0]?.slug === b[0]?.slug &&
        a[0]?.sku === b[0]?.sku &&
        a[0]?.variantSku === b[0]?.variantSku
      );
    } catch {
      return false;
    }
  })();

  bucket.length = 0;
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const checkout = bucket.filter((e) => e.event === "InitiateCheckout");

  await fillCheckout(page);
  bucket.length = 0;
  await page.locator('button:has-text("Place Order")').first().click({ force: true });
  await page.waitForTimeout(12000);
  const purchase = bucket.filter((e) => e.event === "Purchase");

  await ctx.close();
  return {
    productUrl,
    expectedSku,
    ViewContent: sampleEvent(view[0]),
    ViewContentCount: view.length,
    AddToCart: sampleEvent(add[0]),
    AddToCartCount: add.length,
    InitiateCheckout: sampleEvent(checkout[0]),
    InitiateCheckoutCount: checkout.length,
    Purchase: sampleEvent(purchase[0]),
    PurchaseCount: purchase.length,
    orderId,
    serverTotal,
    serverLines: Array.isArray(serverLines)
      ? serverLines.map((l) => ({
          slug: l.slug,
          sku: l.sku,
          variantSku: l.variantSku,
        }))
      : null,
    cartHydrationOk: hydrated,
    cartSku: (() => {
      try {
        return JSON.parse(cartBefore || "[]")[0]?.sku ?? null;
      } catch {
        return null;
      }
    })(),
    expectedPurchaseId: orderId ? `purchase_${orderId}` : null,
    analyticsTrafficSeen: fpHits.length > 0,
  };
}

async function runVariantCase(browser, productUrl) {
  const { ctx, page } = await newAuthedPage(browser);
  const bucket = [];
  attachPixel(page, bucket);
  await clearCart(page);
  await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);

  // Click non-default option if present to force a variant with sku when possible
  const opts = page.locator("#gadget-buy-options button");
  const n = await opts.count();
  if (n > 1) {
    await opts.nth(1).click({ force: true });
    await page.waitForTimeout(400);
  } else if (n === 1) {
    await opts.nth(0).click({ force: true });
    await page.waitForTimeout(400);
  }

  const viewId = contentIds(bucket.filter((e) => e.event === "ViewContent").at(-1))[0] || null;
  bucket.length = 0;
  await clickPdpAdd(page);
  const add = bucket.filter((e) => e.event === "AddToCart");
  const cart = await readCartLine(page);

  bucket.length = 0;
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const checkout = bucket.filter((e) => e.event === "InitiateCheckout");

  await ctx.close();
  const expect = cart?.variantSku || null;
  return {
    productUrl,
    expectedVariantSku: expect,
    viewContentId: viewId,
    addToCartId: contentIds(add[0])[0] || null,
    initiateCheckoutId: contentIds(checkout[0])[0] || null,
    cart,
    AddToCart: sampleEvent(add[0]),
    InitiateCheckout: sampleEvent(checkout[0]),
    ok:
      Boolean(expect) &&
      contentIds(add[0])[0] === expect &&
      contentIds(checkout[0])[0] === expect,
  };
}

async function runFallbackCase(browser, productUrl) {
  const { ctx, page } = await newAuthedPage(browser);
  const bucket = [];
  attachPixel(page, bucket);

  let checkoutStatus = null;
  let orderId = null;
  page.on("response", async (res) => {
    if (!res.url().includes("/api/checkout") || res.request().method() !== "POST") return;
    checkoutStatus = res.status();
    try {
      const data = await res.json();
      if (data?.orderId) orderId = data.orderId;
    } catch {
      /* ignore */
    }
  });

  await clearCart(page);
  await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);
  await clickPdpAdd(page);
  await page.waitForTimeout(800);

  const stripped = await page.evaluate(() => {
    const items = JSON.parse(localStorage.getItem("ecomm-cart") || "[]").map((i) => {
      const { sku, variantSku, ...rest } = i;
      return rest;
    });
    localStorage.setItem("ecomm-cart", JSON.stringify(items));
    return items[0] || null;
  });

  bucket.length = 0;
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const checkout = bucket.filter((e) => e.event === "InitiateCheckout");

  await fillCheckout(page);
  bucket.length = 0;
  await page.locator('button:has-text("Place Order")').first().click({ force: true });
  await page.waitForTimeout(12000);
  const purchase = bucket.filter((e) => e.event === "Purchase");

  await ctx.close();
  const expectedSlugId = stripped?.variantKey
    ? `${stripped.slug}::${stripped.variantKey}`
    : stripped?.slug;

  return {
    productUrl,
    strippedSlug: stripped?.slug || null,
    expectedClientFallbackId: expectedSlugId || null,
    InitiateCheckout: sampleEvent(checkout[0]),
    Purchase: sampleEvent(purchase[0]),
    checkoutHttpStatus: checkoutStatus,
    orderId,
    initiateUsesSlugFallback:
      contentIds(checkout[0])[0] === expectedSlugId ||
      contentIds(checkout[0])[0] === stripped?.slug,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const { ctx, page } = await newAuthedPage(browser);
  const hrefs = await listProductHrefs(page);
  await ctx.close();

  const probes = [];
  for (const href of hrefs.slice(0, 20)) {
    try {
      probes.push(await probeProduct(browser, href));
    } catch (e) {
      probes.push({ href, error: String(e?.message || e) });
    }
  }

  const skuProduct = probes.find(
    (p) =>
      p.cartLine?.sku &&
      !p.cartLine?.variantSku &&
      p.viewContentId &&
      p.viewContentId === p.cartLine.sku &&
      p.cartLine.slug === p.slug
  );

  const variantProduct = probes.find((p) => p.cartLine?.variantSku);

  // If no variantSku in default add, try products with option pickers
  let variantProbeUrl = variantProduct?.href || null;
  if (!variantProbeUrl) {
    for (const p of probes) {
      if (!p.href || p.error) continue;
      const { ctx: c2, page: p2 } = await newAuthedPage(browser);
      await p2.goto(p.href, { waitUntil: "domcontentloaded", timeout: 60000 });
      await p2.waitForTimeout(2000);
      const hasOpts = (await p2.locator("#gadget-buy-options button").count()) > 0;
      await c2.close();
      if (hasOpts) {
        variantProbeUrl = p.href;
        break;
      }
    }
  }

  const report = {
    deployment: {
      base: BASE,
      commit: "00fef35",
      vercel: "Ready (buyntryy.com)",
    },
    probes: probes.map((p) => ({
      slug: p.slug,
      viewContentId: p.viewContentId,
      cartSku: p.cartLine?.sku || null,
      cartVariantSku: p.cartLine?.variantSku || null,
      cartSlug: p.cartLine?.slug || null,
      error: p.error || undefined,
    })),
  };

  if (!skuProduct) {
    report.error = "No SKU-backed product where ViewContent content_id matches cart sku";
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
    process.exit(1);
  }

  report.skuFunnel = await runSkuFunnel(
    browser,
    skuProduct.href,
    skuProduct.cartLine.sku
  );

  if (variantProbeUrl) {
    report.variantCase = await runVariantCase(browser, variantProbeUrl);
  } else {
    report.variantCase = { skipped: true, reason: "No variant picker / variantSku product found" };
  }

  report.fallbackCase = await runFallbackCase(browser, skuProduct.href);
  report.fallbackCase.source = "legacy-strip";

  const s = report.skuFunnel;
  const ids = [
    s.ViewContent?.content_ids?.[0],
    s.AddToCart?.content_ids?.[0],
    s.InitiateCheckout?.content_ids?.[0],
    s.Purchase?.content_ids?.[0],
  ];
  const canonical = s.expectedSku;
  const skuConsistent = ids.every((id) => id === canonical);

  const currencyOk = [s.ViewContent, s.AddToCart, s.InitiateCheckout, s.Purchase].every(
    (e) => e?.currency === "PKR"
  );
  const oneEach =
    s.ViewContentCount === 1 &&
    s.AddToCartCount === 1 &&
    s.InitiateCheckoutCount === 1 &&
    s.PurchaseCount === 1;
  const purchaseIdOk = s.Purchase?.event_id === s.expectedPurchaseId;

  const variantOk = report.variantCase.skipped
    ? false
    : report.variantCase.ok === true;

  const fb = report.fallbackCase;
  const fallbackOk =
    fb.checkoutHttpStatus === 200 &&
    Boolean(fb.orderId) &&
    fb.initiateUsesSlugFallback === true;

  report.checks = {
    skuConsistent,
    canonicalSku: canonical,
    sampleIds: {
      ViewContent: ids[0],
      AddToCart: ids[1],
      InitiateCheckout: ids[2],
      Purchase: ids[3],
    },
    currencyOk,
    oneEach,
    purchaseIdOk,
    cartHydrationOk: s.cartHydrationOk,
    variantOk,
    fallbackOk,
    analyticsTrafficSeen: s.analyticsTrafficSeen,
  };

  report.pass =
    skuConsistent &&
    currencyOk &&
    oneEach &&
    purchaseIdOk &&
    s.cartHydrationOk &&
    variantOk &&
    fallbackOk;

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
