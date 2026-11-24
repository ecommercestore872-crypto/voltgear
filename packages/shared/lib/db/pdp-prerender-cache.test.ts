import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * Regression guard for the Vercel build failure
 * "Dynamic server usage: Route /product/[slug] couldn't be rendered statically
 * because it used no-store fetch".
 *
 * Every Supabase request is "no-store", so any catalog read made while a product
 * page renders must go through unstable_cache. These checks read the source so
 * a future edit can't quietly reintroduce a bare read (it only breaks the build
 * once a product has a deal partner, so normal tests would never notice).
 */
const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), "utf8");

describe("product page catalog reads are cached", () => {
  it("the PDP uses the cached partner loader, never the bare one", () => {
    const pdp = read("../../components/product/gadget-pdp-deferred.tsx");
    assert.match(pdp, /fetchCachedCatalogProductsBySlugs/);
    assert.doesNotMatch(pdp, /\bfetchCatalogProductsBySlugs\b/);
  });

  it("the PDP never lets a failed deal-partner lookup fail the page", () => {
    const pdp = read("../../components/product/gadget-pdp-deferred.tsx");
    assert.match(pdp, /fetchCachedCatalogProductsBySlugs\(dealSlugs\)\.catch\(/);
  });

  it("the cached partner loader wraps the query in unstable_cache", () => {
    const store = read("./store-catalog-store.ts");
    const body = store.slice(store.indexOf("export async function fetchCachedCatalogProductsBySlugs"));
    assert.match(body.slice(0, body.indexOf("async function loadCatalogProductsBySlugs")), /unstable_cache\(/);
  });

  it("the deal catalog loader used by the PDP wraps the query in unstable_cache", () => {
    const deals = read("./deal-store.ts");
    const start = deals.indexOf("export async function fetchDealCatalogForSlugs");
    const end = deals.indexOf("async function loadDealCatalogForSlugs");
    assert.ok(start >= 0 && end > start);
    assert.match(deals.slice(start, end), /unstable_cache\(/);
  });
});
