import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBestsellers } from "./bestsellers-rules";

describe("pickBestsellers", () => {
  const products = [
    { id: "a", featured: true, stockStatus: "in-stock" },
    { id: "b", featured: false, stockStatus: "in-stock" },
    { id: "c", featured: true, stockStatus: "out-of-stock" },
    { id: "d", featured: false, stockStatus: "in-stock" },
    { id: "e", featured: false, stockStatus: "in-stock" },
  ];

  it("puts featured first and skips out of stock", () => {
    const ids = pickBestsellers({
      products,
      orderCounts: { b: 10, d: 5 },
      viewCounts: {},
      limit: 8,
    });
    assert.deepEqual(ids[0], "a");
    assert.equal(ids.includes("c"), false);
  });

  it("fills with most ordered then most viewed", () => {
    const ids = pickBestsellers({
      products: [
        { id: "f1", featured: true, stockStatus: "in-stock" },
        { id: "o1", stockStatus: "in-stock" },
        { id: "o2", stockStatus: "in-stock" },
        { id: "v1", stockStatus: "in-stock" },
      ],
      orderCounts: { o1: 9, o2: 3 },
      viewCounts: { v1: 100, o2: 50 },
      limit: 8,
    });
    assert.deepEqual(ids, ["f1", "o1", "o2", "v1"]);
  });

  it("respects limit and returns empty when nothing qualifies", () => {
    assert.deepEqual(
      pickBestsellers({
        products: [{ id: "x", stockStatus: "out-of-stock" }],
        orderCounts: {},
        viewCounts: {},
      }),
      []
    );
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      featured: i < 2,
      stockStatus: "in-stock" as const,
    }));
    const ids = pickBestsellers({
      products: many,
      orderCounts: Object.fromEntries(many.map((p, i) => [p.id, 12 - i])),
      viewCounts: {},
      limit: 8,
    });
    assert.equal(ids.length, 8);
  });
});
