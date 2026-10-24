import assert from "node:assert/strict";
import { it } from "node:test";
import { confirmedCollection, validateCollectionInput } from "./collection-input";
import { productMutationRequest, validateProductInput } from "./admin-product-input";

const id = "10000000-0000-0000-0000-000000000001";
const good = { name: "Synthetic", mode: "manual", autoRule: null, homeSlot: null, active: true, productIds: [id], expectedRevision: "4" };
for (const [field, value] of Object.entries({ name: 2, slug: {}, description: false, mode: "other", autoRule: "other", homeSlot: "other", active: "true", productIds: [id, id], expectedRevision: 4, expectedSlotRevision: -1 })) {
  it(`rejects malformed collection ${field} without coercion`, () => assert.throws(() => validateCollectionInput({ ...good, [field]: value }, "update")));
}
it("requires revision for update and delete and rejects unsupported fields/actions", () => {
  assert.throws(() => validateCollectionInput({}, "delete"));
  assert.throws(() => validateCollectionInput({ ...good, expectedRevision: undefined }, "update"));
  assert.throws(() => validateCollectionInput({ ...good, action: "erase" }, "update"));
  assert.doesNotThrow(() => validateCollectionInput({ expectedRevision: "0" }, "delete"));
});
it("validates slot CAS, mode consistency and ordered unique canonical UUID membership", () => {
  assert.throws(() => validateCollectionInput({ ...good, homeSlot: "featured" }, "update"));
  assert.doesNotThrow(() => validateCollectionInput({ ...good, homeSlot: "featured", expectedSlotRevision: "3" }, "update"));
  assert.doesNotThrow(() => validateCollectionInput({ ...good, mode: "auto", autoRule: "featured" }, "update"));
  assert.throws(() => validateCollectionInput({ ...good, productIds: ["ABC00000-0000-0000-0000-000000000001"] }, "update"));
  assert.doesNotThrow(() => validateCollectionInput(good, "update"));
});
it("accepts only confirmed exact collection identity and revision", () => {
  const result = { ...good, id, slug: "synthetic", revision: "5" };
  assert.equal(confirmedCollection(result, id), true);
  assert.equal(confirmedCollection({ ...result, revision: undefined }, id), false);
  assert.equal(confirmedCollection(result, "different"), false);
  assert.equal(confirmedCollection({ ...result, productIds: [false] }, id), false);
});
it("rejects malformed collection intents rather than rebasing them", () => {
  for (const intent of [null, { mode: "adjust" }, { mode: "adjust", expectedRevision: 3 }, { mode: "preserve", expectedRevision: "0" }, { mode: "unknown" }]) {
    assert.throws(() => validateProductInput({ collectionIntent: intent }));
  }
  assert.doesNotThrow(() => validateProductInput({ collectionIntent: { mode: "adjust", expectedRevision: "2" } }));
});
it("product API requires explicit reviewed intent and selection together", () => {
  const request = { action: "publish", expectedAdminRevision: "4", doc: { price: 100, collectionIntent: { mode: "preserve" } }, collectionIds: [id] };
  assert.throws(() => productMutationRequest(request));
  assert.throws(() => productMutationRequest({ ...request, doc: { price: 100 } }));
  const doc = { price: 100, collectionIntent: { mode: "adjust", expectedRevision: "2" } };
  assert.throws(() => productMutationRequest({ ...request, doc, collectionIds: null }));
  assert.doesNotThrow(() => productMutationRequest({ ...request, doc, collectionIds: [] }));
  assert.doesNotThrow(() => productMutationRequest({ ...request, collectionIds: null }));
});
