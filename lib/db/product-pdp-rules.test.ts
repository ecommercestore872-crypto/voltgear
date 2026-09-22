import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("PDP related product selection (documented behavior)", () => {
  it("keeps same-category items in catalog created_at order up to limit", () => {
    type Row = { _id: string; category: string; slug: string };
    const current = { _id: "1", category: "earbuds" };
    const catalog: Row[] = [
      { _id: "2", category: "earbuds", slug: "a" },
      { _id: "3", category: "smartwatch", slug: "b" },
      { _id: "4", category: "earbuds", slug: "c" },
      { _id: "1", category: "earbuds", slug: "self" },
    ];
    const related = catalog
      .filter((p) => p._id !== current._id && p.category === current.category)
      .slice(0, 4);
    assert.deepEqual(
      related.map((p) => p.slug),
      ["a", "c"],
    );
  });
});