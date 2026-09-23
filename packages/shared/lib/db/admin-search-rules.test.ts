import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreAdminSearchHits, type AdminSearchHit } from "./admin-search-rules";

describe("scoreAdminSearchHits", () => {
  it("returns empty for blank query", () => {
    assert.deepEqual(
      scoreAdminSearchHits("  ", {
        orders: [{ orderId: "VG-1001" }],
        products: [{ id: "1", name: "Watch", slug: "watch" }],
        customers: [{ key: "a@b.com", name: "Ali", email: "a@b.com", phone: "" }],
      }),
      []
    );
  });

  it("ranks order id, product name, and customer email", () => {
    const hits = scoreAdminSearchHits("vg-10", {
      orders: [{ orderId: "VG-1001" }, { orderId: "VG-2002" }],
      products: [{ id: "p1", name: "VoltGear Watch", slug: "voltgear-watch" }],
      customers: [
        { key: "ali@ex.com", name: "Ali", email: "ali@ex.com", phone: "0300" },
      ],
    });
    assert.ok(hits.some((h: AdminSearchHit) => h.href.includes("VG-1001")));
    assert.equal(hits[0]?.kind, "order");
  });

  it("finds products by slug fragment", () => {
    const hits = scoreAdminSearchHits("watch", {
      orders: [],
      products: [{ id: "p1", name: "Ultra", slug: "voltgear-watch" }],
      customers: [],
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.kind, "product");
  });
});
