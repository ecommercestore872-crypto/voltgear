import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isoToPktInput, pktInputToIso, withSale } from "./product-sale-rules";

const NOW = Date.parse("2026-11-24T10:00:00Z");
const base = { price: 1000, compareAtPrice: undefined as number | undefined };

describe("withSale", () => {
  it("applies an active sale and keeps the end time", () => {
    const p = withSale({ ...base, salePrice: 800, saleEndsAt: "2026-11-24T11:00:00Z" }, NOW);
    assert.equal(p.price, 800);
    assert.equal(p.compareAtPrice, 1000);
    assert.equal(p.saleEndsAt, "2026-11-24T11:00:00Z");
  });

  it("drops an expired sale: regular price, no timer", () => {
    const p = withSale({ ...base, salePrice: 800, saleEndsAt: "2026-11-24T09:59:59Z" }, NOW);
    assert.equal(p.price, 1000);
    assert.equal(p.saleEndsAt, undefined);
  });

  it("sale without end time applies with no timer; no sale price changes nothing", () => {
    assert.equal(withSale({ ...base, salePrice: 800 }, NOW).price, 800);
    assert.equal(withSale({ ...base, salePrice: 800 }, NOW).saleEndsAt, undefined);
    assert.equal(withSale({ ...base }, NOW).price, 1000);
  });

  it("ignores a sale price not below the regular price", () => {
    assert.equal(withSale({ ...base, salePrice: 1200 }, NOW).price, 1000);
  });
});

describe("Pakistan time conversion", () => {
  it("round-trips UTC+5", () => {
    assert.equal(pktInputToIso("2026-11-24T20:00"), "2026-11-24T15:00:00.000Z");
    assert.equal(isoToPktInput("2026-11-24T15:00:00.000Z"), "2026-11-24T20:00");
  });
});

// Checkout resolves prices from mapProduct({ storefront: true }) (fetchProductBySlug), which uses the server clock.
describe("checkout price path (mapProduct storefront)", () => {
  const row = (ends: string) => ({
    id: "p1", slug: "p", name: "P", category: "c", status: "published",
    price: 1000, sale_price: 800, sale_ends_at: ends,
  });
  it("charges the sale price while active", async () => {
    const { mapProduct } = await import("./db/map");
    const p = mapProduct(row(new Date(Date.now() + 60_000).toISOString()), { storefront: true });
    assert.equal(p?.price, 800);
  });
  it("charges the regular price once expired", async () => {
    const { mapProduct } = await import("./db/map");
    const p = mapProduct(row(new Date(Date.now() - 1_000).toISOString()), { storefront: true });
    assert.equal(p?.price, 1000);
  });
});
