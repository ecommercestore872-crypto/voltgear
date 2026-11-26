#!/usr/bin/env node
/**
 * Read-only smoke test. Run on a Vercel preview before merging and on production right after.
 *   node scripts/smoke-storefront.mjs https://buyntryy.com [minProducts]
 * Fails (exit 1) if the sitemap shrank, or any category/product/key page is not 200 or has no price.
 */
const base = (process.argv[2] || "").replace(/\/$/, "");
const minProducts = Number(process.argv[3] || 0);
if (!base) {
  console.error("usage: node scripts/smoke-storefront.mjs <baseUrl> [minProducts]");
  process.exit(2);
}

const get = async (url) => {
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "bnt-smoke/1" } });
    return { status: res.status, body: await res.text() };
  } catch (e) {
    return { status: 0, body: "" };
  }
};

const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

const sitemap = await get(`${base}/sitemap.xml`);
check(sitemap.status === 200, `sitemap.xml status ${sitemap.status}`);
const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const path = (u) => new URL(u).pathname;
const products = locs.filter((u) => path(u).startsWith("/product/"));
const categories = locs.filter((u) => /^\/products\/[^/]+$/.test(path(u)));
console.log(`sitemap: ${locs.length} urls, ${products.length} products, ${categories.length} categories`);
check(products.length >= minProducts, `only ${products.length} products in sitemap, expected >= ${minProducts}`);

// Same path on the preview host, so a preview is judged on its own pages.
const local = (u) => `${base}${path(u)}`;
const sample = [...products.slice(0, 12), ...products.slice(-3)];
const targets = [
  ...["/", "/products", "/cart", "/checkout", "/shipping-returns", "/robots.txt", "/llms.txt"].map((p) => `${base}${p}`),
  ...categories.map(local),
  ...sample.map(local),
];

for (const url of [...new Set(targets)]) {
  try {
    const { status, body } = await get(url);
    check(status === 200, `${path(url)} -> ${status}`);
    if (path(url).startsWith("/product/")) {
      check(/PKR|Rs\.?\s?\d/.test(body), `${path(url)} shows no price`);
      check(/rel="canonical"/.test(body), `${path(url)} has no canonical`);
      check(!/noindex/i.test(body), `${path(url)} is noindex`);
    }
  } catch (e) {
    check(false, `${path(url)} failed: ${e.message}`);
  }
}

if (failures.length) {
  console.error(`\nSMOKE FAILED (${failures.length})\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("SMOKE OK");
