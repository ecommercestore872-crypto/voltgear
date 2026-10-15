import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { scopeCheckoutIdempotencyKey } from "./checkout-idempotency";

const root = path.resolve(__dirname, "../../..");
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), "utf8");

const migration = read(
  "supabase/migrations/20261022000000_demo_sandbox_isolation.sql",
);
const orderAdapter = read("packages/shared/lib/db/store-order-store.ts");
const tracking = read("packages/shared/lib/checkout-post-persist-tracking.ts");
const contactRoute = read("apps/storefront/app/api/contact/route.ts");
const abandonedRoute = read("apps/storefront/app/api/abandoned-cart/route.ts");
const newsletterRoute = read("apps/storefront/app/api/newsletter/route.ts");
const reviewRoute = read("apps/storefront/app/api/reviews/route.ts");
const reviewStore = read("packages/shared/lib/db/store-review-store.ts");
const orderStore = read("packages/shared/lib/db/store-order-store.ts");

describe("demo sandbox isolation", () => {
  it("namespaces live and practice idempotency independently", () => {
    assert.equal(scopeCheckoutIdempotencyKey("abc", false), "live:abc");
    assert.equal(scopeCheckoutIdempotencyKey("abc", true), "demo:abc");
    assert.equal(scopeCheckoutIdempotencyKey(null, true), null);
  });

  it("routes practice checkout through a no-reservation command", () => {
    assert.match(orderAdapter, /input\.isDemo[\s\S]*checkout_place_demo_order/);
    assert.match(migration, /inventory_reserved[\s\S]*false/);
    assert.doesNotMatch(
      migration.match(/FUNCTION public\.checkout_place_demo_order[\s\S]*?\$\$ LANGUAGE/iu)?.[0] ?? "",
      /UPDATE public\.products\s+SET quantity/iu,
    );
  });

  it("restores only inventory actually reserved by an order", () => {
    assert.match(migration, /IF v_order\.inventory_reserved THEN/iu);
    assert.match(
      migration,
      /o\.is_demo IS TRUE AND o\.inventory_reserved IS TRUE/iu,
    );
    assert.match(migration, /status = 'cancelled'[\s\S]*inventory_reserved IS TRUE/iu);
  });

  it("blocks practice marketing, attribution, and external notifications", () => {
    assert.match(tracking, /if \(input\.isDemo\) return/);
    assert.match(abandonedRoute, /isDemoRequest\(request\)[\s\S]*demo: true/);
    assert.match(newsletterRoute, /isDemoRequest\(req\)[\s\S]*Practice signup recorded/);
    assert.match(contactRoute, /isDemo = isDemoRequest\(request\)/);
    assert.match(contactRoute, /webhookUrl && !isDemo/);
    assert.doesNotMatch(contactRoute, /Boolean\(body\?\.isDemo\)/);
  });

  it("purges all retained practice records with service-role-only RPCs", () => {
    assert.match(migration, /DELETE FROM public\.contact_submissions WHERE is_demo IS TRUE/iu);
    assert.match(
      migration,
      /REVOKE ALL ON FUNCTION public\.checkout_place_demo_order[\s\S]*authenticated/iu,
    );
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.admin_purge_demo_data\(\) TO service_role/iu,
    );
  });

  it("keeps practice orders and pending reviews out of live customer identity", () => {
    assert.match(orderStore, /customer->>email[\s\S]*\.eq\("is_demo", options\?\.demo === true\)/);
    assert.match(reviewRoute, /getOrdersByEmail[\s\S]*demo: isDemo/);
    assert.match(reviewStore, /\.eq\("is_demo", Boolean\(input\.isDemo\)\)/);
  });
});
