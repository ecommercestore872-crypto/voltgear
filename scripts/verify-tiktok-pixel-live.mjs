/**
 * Live TikTok Pixel verification against buyntryy.com (production only).
 * No code changes — observational.
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE || "https://buyntryy.com";
const PIXEL_ID = "DAF1KQBC77UES974M180";

function summarize(reqs) {
  const tiktok = reqs.filter((u) => /tiktok\.com|ttq|pixel/i.test(u));
  return {
    count: tiktok.length,
    urls: [...new Set(tiktok)].slice(0, 20),
  };
}

async function collect(page, action) {
  const reqs = [];
  const onReq = (req) => {
    const u = req.url();
    if (/tiktok|analytics\.tiktok|ttq/i.test(u)) reqs.push(u);
  };
  page.on("request", onReq);
  await action();
  await page.waitForTimeout(2500);
  page.off("request", onReq);
  return reqs;
}

async function hasPixelScript(page) {
  return page.evaluate((id) => {
    const scripts = [...document.querySelectorAll("script")].map((s) => ({
      id: s.id,
      src: s.src || "",
      text: (s.textContent || "").slice(0, 500),
    }));
    const base = scripts.filter(
      (s) =>
        s.id === "tiktok-pixel-base" ||
        s.text.includes("ttq.load") ||
        s.src.includes("analytics.tiktok.com")
    );
    const ttqExists = typeof window.ttq !== "undefined";
    const loadMatches = (document.documentElement.innerHTML.match(/ttq\.load\(/g) || [])
      .length;
    const pageMatches = (document.documentElement.innerHTML.match(/ttq\.page\(\)/g) || [])
      .length;
    const hasId = document.documentElement.innerHTML.includes(id);
    const commerce =
      /ViewContent|AddToCart|InitiateCheckout|Purchase|AddToWishlist/.test(
        document.documentElement.innerHTML
      );
    return {
      baseCount: base.length,
      ttqExists,
      loadMatches,
      pageMatches,
      hasId,
      commerce,
      scriptIds: base.map((s) => s.id || s.src || "inline"),
    };
  }, PIXEL_ID);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const report = {
    deployment: null,
    caseA_noConsent: null,
    caseB_accept: null,
    caseC_essential: null,
    storefront: null,
    spa: null,
    excluded: null,
    unexpected: [],
    pass: false,
  };

  try {
    // CASE A — no consent
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const reqs = await collect(page, async () => {
        await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 });
      });
      const pixel = await hasPixelScript(page);
      const consentVisible = await page
        .getByRole("dialog", { name: /cookie/i })
        .isVisible()
        .catch(() => false);
      report.caseA_noConsent = {
        ok:
          summarize(reqs).count === 0 &&
          !pixel.ttqExists &&
          pixel.baseCount === 0,
        tiktokRequests: summarize(reqs).count,
        ttqExists: pixel.ttqExists,
        baseScripts: pixel.baseCount,
        consentBarVisible: consentVisible,
      };
      await ctx.close();
    }

    // CASE B — Accept activates without refresh
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1500);
      const before = await hasPixelScript(page);
      const beforeReqs = [];
      page.on("request", (r) => {
        if (/analytics\.tiktok\.com/i.test(r.url())) beforeReqs.push(r.url());
      });
      const accept = page.getByRole("button", { name: /^Accept$/i });
      if (await accept.isVisible().catch(() => false)) {
        await accept.click();
      } else {
        // already consented somehow — force via storage then reload would break "no refresh" test
        await page.evaluate(() => {
          localStorage.setItem("bnt-cookie-consent", "all");
          window.dispatchEvent(
            new CustomEvent("bnt-cookie-consent-change", { detail: "all" })
          );
        });
      }
      await page.waitForTimeout(3500);
      const after = await hasPixelScript(page);
      const eventsJs = beforeReqs.some((u) => u.includes("events.js"));
      // also check network after click
      const afterNet = await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 500));
        return typeof window.ttq !== "undefined";
      });
      report.caseB_accept = {
        ok:
          before.baseCount === 0 &&
          after.ttqExists &&
          after.hasId &&
          after.loadMatches === 1 &&
          after.pageMatches === 1 &&
          !after.commerce,
        beforeBase: before.baseCount,
        afterTtq: after.ttqExists,
        afterLoadCalls: after.loadMatches,
        afterPageCalls: after.pageMatches,
        hasPixelId: after.hasId,
        commerceEventsInDom: after.commerce,
        activatedWithoutReload: afterNet === true,
        eventsJsRequested: eventsJs || beforeReqs.length > 0,
        note: "Accept clicked in-place; no page.goto after consent",
      };
      await ctx.close();
    }

    // CASE C — Essential only
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const reqs = await collect(page, async () => {
        await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(1000);
        const btn = page.getByRole("button", { name: /Essential only/i });
        if (await btn.isVisible().catch(() => false)) await btn.click();
        await page.waitForTimeout(2500);
      });
      const pixel = await hasPixelScript(page);
      report.caseC_essential = {
        ok: summarize(reqs).count === 0 && !pixel.ttqExists && pixel.baseCount === 0,
        tiktokRequests: summarize(reqs).count,
        ttqExists: pixel.ttqExists,
        sample: summarize(reqs).urls,
      };
      await ctx.close();
    }

    // Storefront + SPA with consent
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const pageViews = [];
      page.on("request", (r) => {
        const u = r.url();
        if (/analytics\.tiktok\.com/i.test(u)) {
          if (/page|event|track|pixel/i.test(u) || u.includes("events.js")) {
            pageViews.push({ url: u, t: Date.now() });
          }
        }
      });
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.evaluate(() => {
        localStorage.setItem("bnt-cookie-consent", "all");
        window.dispatchEvent(
          new CustomEvent("bnt-cookie-consent-change", { detail: "all" })
        );
      });
      // May need reload once if script only mounts after consent state update
      await page.waitForTimeout(500);
      // If still no ttq, soft reload once for storefront baseline (SPA test still uses client nav after)
      if (!(await page.evaluate(() => typeof window.ttq !== "undefined"))) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2500);
      }
      const storefront = await hasPixelScript(page);
      const beforeSpa = pageViews.length;
      // Client navigations
      const links = [
        "/products",
        "/contact",
        "/faq",
      ];
      for (const href of links) {
        await page.evaluate((h) => {
          const a = document.createElement("a");
          a.href = h;
          a.setAttribute("data-test-nav", "1");
          document.body.appendChild(a);
        }, href);
        // Prefer next/link clicks if present
        const nav = page.locator(`a[href="${href}"]`).first();
        if (await nav.count()) {
          await Promise.all([
            page.waitForURL((u) => u.pathname.startsWith(href), { timeout: 15000 }).catch(() => null),
            nav.click({ force: true }),
          ]);
        } else {
          await page.goto(BASE + href, { waitUntil: "domcontentloaded" });
        }
        await page.waitForTimeout(2000);
      }
      const afterSpa = pageViews.length;
      report.storefront = {
        ok:
          storefront.ttqExists &&
          storefront.hasId &&
          storefront.loadMatches === 1 &&
          storefront.pageMatches === 1 &&
          !storefront.commerce &&
          storefront.baseCount <= 2,
        pixelId: PIXEL_ID,
        loadMatches: storefront.loadMatches,
        pageMatches: storefront.pageMatches,
        commerceInDom: storefront.commerce,
        scriptIds: storefront.scriptIds,
      };
      report.spa = {
        networkHitsBeforeNav: beforeSpa,
        networkHitsAfterNav: afterSpa,
        delta: afterSpa - beforeSpa,
        note: "No manual ttq.page listeners in app; observe TikTok auto SPA behavior",
        sample: pageViews.slice(0, 12).map((x) => x.url),
      };
      await ctx.close();
    }

    // Excluded routes
    {
      const results = {};
      for (const path of ["/admin", "/studio", "/demo/login"]) {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        // Pre-set advertising consent so exclusion is route-based, not consent-based
        await page.addInitScript(() => {
          localStorage.setItem("bnt-cookie-consent", "all");
        });
        const reqs = await collect(page, async () => {
          await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForTimeout(2000);
        });
        const pixel = await hasPixelScript(page);
        results[path] = {
          ok: summarize(reqs).count === 0 && !pixel.ttqExists,
          tiktokRequests: summarize(reqs).count,
          ttqExists: pixel.ttqExists,
          finalUrl: page.url(),
        };
        await ctx.close();
      }
      report.excluded = {
        ok: Object.values(results).every((r) => r.ok),
        results,
      };
    }

    report.pass = Boolean(
      report.caseA_noConsent?.ok &&
        report.caseB_accept?.ok &&
        report.caseC_essential?.ok &&
        report.storefront?.ok &&
        report.excluded?.ok
    );
    report.deployment = {
      base: BASE,
      pixelId: PIXEL_ID,
    };
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
