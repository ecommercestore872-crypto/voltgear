import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupProductsByCategory } from "./product-list-group-rules";

describe("groupProductsByCategory", () => {
  it("keeps shop type order and shows empty groups", () => {
    const groups = groupProductsByCategory(
      [
        { category: "power-banks", name: "PB1" },
        { category: "smartwatches", name: "SW1" },
      ],
      [
        { slug: "smartwatches", name: "Smartwatches" },
        { slug: "power-banks", name: "Power banks" },
        { slug: "earbuds", name: "Earbuds" },
      ]
    );
    assert.deepEqual(
      groups.map((g) => [g.slug, g.name, g.products.map((p) => p.name)]),
      [
        ["smartwatches", "Smartwatches", ["SW1"]],
        ["power-banks", "Power banks", ["PB1"]],
        ["earbuds", "Earbuds", []],
      ]
    );
  });

  it("appends unknown categories after shop types", () => {
    const groups = groupProductsByCategory(
      [{ category: "legacy-kit", name: "Old" }],
      [{ slug: "smartwatches", name: "Smartwatches" }]
    );
    assert.equal(groups.length, 2);
    assert.equal(groups[0].slug, "smartwatches");
    assert.equal(groups[0].products.length, 0);
    assert.equal(groups[1].slug, "legacy-kit");
    assert.equal(groups[1].products[0].name, "Old");
  });
});
