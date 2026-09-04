import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canAssignProductToCollection,
  canSaveCollection,
  extraHomeCollectionRails,
  inferHomeSlotFromName,
  membershipIdsForProduct,
  parseCollectionIds,
  slugifyCollectionName,
} from "./collection-rules";

describe("collection-rules", () => {
  it("slugifies names", () => {
    assert.equal(slugifyCollectionName("New Arrivals!"), "new-arrivals");
  });

  it("requires name and valid auto rule", () => {
    assert.equal(canSaveCollection({ name: "", mode: "manual" }).ok, false);
    assert.equal(
      canSaveCollection({ name: "Best", mode: "auto", autoRule: null }).ok,
      false
    );
    assert.equal(
      canSaveCollection({
        name: "Best",
        mode: "auto",
        autoRule: "bestsellers",
      }).ok,
      true
    );
  });
});

describe("inferHomeSlotFromName", () => {
  it("maps featured / best seller / offers names onto existing home rails", () => {
    assert.equal(inferHomeSlotFromName("Best Sellers"), "bestsellers");
    assert.equal(inferHomeSlotFromName("best-seller"), "bestsellers");
    assert.equal(inferHomeSlotFromName("Featured"), "featured");
    assert.equal(inferHomeSlotFromName("Best Offers"), "offers");
    assert.equal(inferHomeSlotFromName("Summer Picks"), null);
    assert.equal(inferHomeSlotFromName("Featured Accessories"), null);
  });
});

describe("parseCollectionIds", () => {
  it("treats missing as no-op and arrays as the exact membership set", () => {
    assert.equal(parseCollectionIds(undefined), null);
    assert.deepEqual(parseCollectionIds([]), []);
    assert.deepEqual(parseCollectionIds([" a ", "", "b"]), ["a", "b"]);
    assert.deepEqual(parseCollectionIds("nope"), []);
  });
});

describe("product collection membership", () => {
  it("only lets products join manual collections", () => {
    assert.equal(canAssignProductToCollection("manual"), true);
    assert.equal(canAssignProductToCollection("auto"), false);
  });

  it("lists the collections a product already belongs to", () => {
    const ids = membershipIdsForProduct(
      [
        { id: "feat", productIds: ["p1"] },
        { id: "best", productIds: ["p2", "p1"] },
        { id: "other", productIds: [] },
      ],
      "p1"
    );
    assert.deepEqual(ids, ["feat", "best"]);
  });

  it("shows extra home rails for active collections that do not own a reserved slot", () => {
    const rails = extraHomeCollectionRails([
      { id: "a", active: true, homeSlot: null, name: "Summer" },
      { id: "b", active: true, homeSlot: "bestsellers", name: "Best" },
      { id: "c", active: false, homeSlot: null, name: "Hidden" },
      { id: "d", active: true, homeSlot: "featured", name: "Spot" },
    ]);
    assert.deepEqual(
      rails.map((r) => r.id),
      ["a"]
    );
  });
});
