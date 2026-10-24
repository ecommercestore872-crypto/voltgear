import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as input from "./admin-product-input";
import * as publish from "./db/publish";

const id = "11111111-1111-4111-8111-111111111111";
const collection = "22222222-2222-4222-8222-222222222222";
const document: publish.ProductDocument = { name: "Fixture", slug: "fixture", category: "charger", price: 1200, images: [], quantity: 8, stockStatus: "in-stock", brand: "Fixture" };

describe("raw product integrity validation", () => {
  for (const price of ["12", "broken", null, true, -1, NaN, Infinity, 0.001, 1.00000000001, Number.MAX_SAFE_INTEGER]) {
    it(`rejects malformed price ${String(price)} before normalization`, () => assert.throws(() => publish.mergeProductForm(document, { ...document, price } as unknown as publish.ProductDocument), input.ProductInputError));
  }
  for (const quantity of ["5", true, -1, 1.5, NaN, Infinity, 2_147_483_648]) {
    it(`rejects invalid quantity ${String(quantity)} rather than untracking`, () => assert.throws(() => publish.mergeProductForm(document, { ...document, quantity } as unknown as publish.ProductDocument), input.ProductInputError));
  }
  it("preserves omitted inventory and price but accepts explicit untracking and optional-money clearing", () => {
    const { quantity: _quantity, price: _price, ...patch } = document;
    const result = publish.mergeProductForm({ ...document, costPrice: 20, compareAtPrice: 1500 }, patch as publish.ProductDocument);
    assert.equal(result.quantity, 8); assert.equal(result.price, 1200);
    const cleared = publish.mergeProductForm(document, { ...document, quantity: null, costPrice: null, compareAtPrice: null });
    assert.equal(cleared.quantity, null); assert.equal(cleared.costPrice, null); assert.equal(cleared.compareAtPrice, null);
  });
  it("requires an explicit price when no existing product can supply it", () => {
    const { price: _price, ...missing } = document;
    assert.throws(() => publish.mergeProductForm(undefined, missing as publish.ProductDocument));
    assert.equal(publish.canPublish({ ...document, price: 0 }, [{ slug: "charger" }]).ok, false);
  });
  for (const malformed of [
    { variants: "bad" }, { variants: [null] }, { variants: [{ name: "Red", price: -1, stockStatus: "in-stock" }] },
    { variants: [{ name: "Red", price: 1, compareAtPrice: 0, stockStatus: "in-stock" }] },
    { variants: [{ _key: "a", name: "Red", stockStatus: "in-stock" }, { _key: "a", name: "Blue", stockStatus: "in-stock" }] },
    { addons: [{ name: "Cable", price: -50 }] }, { addons: [{ name: "Cable", price: "20" }] },
    { colorEnabled: "false" }, { colorOptions: [null] }, { colorOptions: [{ key: "red", name: "Red", enabled: "false" }] },
    { compareAtPrice: -1 }, { compareAtPrice: 1199 }, { costPrice: "12" }, { images: [null] }, { productVideo: { url: 3 } },
  ]) {
    it(`rejects malformed nested fields ${JSON.stringify(malformed)}`, () => assert.throws(() => input.validateProductInput({ ...document, ...malformed })));
  }
  it("never carries review rows or aggregates into merged catalog authority", () => {
    const merged = publish.mergeProductForm(document, { ...document, reviews: [{ name: "Stale", rating: 1 }], rating: 1, reviewCount: 1 });
    assert.equal(Object.hasOwn(merged, "reviews"), false); assert.equal(Object.hasOwn(merged, "rating"), false);
    assert.equal(Object.hasOwn(publish.toLiveProductRow(document), "review_count"), false);
  });
  it("retains legacy text descriptions and distinguishes omission from explicit clears", () => {
    const existing = { ...document, description: "Existing text" };
    assert.equal(publish.mergeProductForm(existing, document).description, "Existing text");
    assert.equal(publish.mergeProductForm(existing, { ...document, description: null }).description, null);
    assert.deepEqual(publish.mergeProductForm(existing, { ...document, description: [] }).description, []);
    assert.throws(() => input.validateProductInput({ ...document, inventoryIntent: { mode: "adjust", expectedRevision: "0", quantity: 8, stockStatus: "in-stock", extra: true } }));
  });
  it("persists original inventory intent across merges and rejects contradictory values", () => {
    const existing = { ...document, inventoryIntent: { mode: "adjust" as const, expectedRevision: "2", quantity: 8, stockStatus: "in-stock" as const } };
    const result = publish.mergeProductForm(existing, { ...document, name: "Edited" });
    assert.equal(result.inventoryIntent?.mode, "adjust");
    assert.equal(result.inventoryIntent?.mode === "adjust" && result.inventoryIntent.expectedRevision, "2");
    assert.throws(() => input.validateProductInput({ ...existing, quantity: 7 }));
    assert.throws(() => input.validateProductInput({ ...document, inventoryIntent: { mode: "preserve", quantity: 8 } }));
  });
});

describe("product request and numeric text boundaries", () => {
  it("never rounds bigint revisions into a potentially future inventory baseline", () => {
    assert.equal(input.readProductRevision(0), "0");
    assert.equal(input.readProductRevision("9223372036854775807"), "9223372036854775807");
    assert.equal(input.readProductRevision(9007199254740996), undefined);
    assert.equal(input.readProductRevision(-1), undefined);
  });
  for (const action of [null, 0, {}, [], "publish-now", "delete", "create"]) it(`rejects unsupported PATCH action ${JSON.stringify(action)}`, () => assert.throws(() => input.productMutationRequest({ action, doc: document, expectedAdminRevision: "3" })));
  for (const body of [null, [], "bad", { doc: null }, { action: "save", doc: document }, { action: "publish", doc: document, expectedAdminRevision: "-1" }]) it(`rejects invalid body/revision ${JSON.stringify(body)}`, () => assert.throws(() => input.productMutationRequest(body)));
  it("retains omitted default-save action and omitted/null collection no-op semantics", () => {
    const parsed = input.productMutationRequest({ doc: document, expectedAdminRevision: "3" });
    assert.equal(parsed.action, "save"); assert.equal(parsed.collectionIds, undefined);
    assert.equal(input.productMutationRequest({ doc: document, expectedAdminRevision: "3", collectionIds: null }).collectionIds, null);
    assert.deepEqual(input.productMutationRequest({ doc: { ...document, collectionIntent: { mode: "adjust", expectedRevision: "0" } }, expectedAdminRevision: "3", collectionIds: [] }).collectionIds, []);
  });
  for (const ids of ["wrong", [null], [3], [collection, collection], ["not-a-uuid"]]) it(`rejects malformed membership ${JSON.stringify(ids)}`, () => assert.throws(() => input.productMutationRequest({ doc: document, expectedAdminRevision: "3", collectionIds: ids })));
  it("does not convert empty required amounts or malformed optional quantities into zero/null", () => {
    for (const raw of ["", " ", "-", "1x", "-1", "Infinity", "1e9"]) assert.throws(() => input.productNumberText(raw));
    assert.throws(() => input.productNumberText("1.5", true, true));
    assert.equal(input.productNumberText("", true, true), null);
    assert.equal(input.productNumberText("0"), 0);
    assert.equal(input.productNumberText("123.45"), 123.45);
  });
});

function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Request, Response, URL, Date,
    require(name: string) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; },
  });
  return exports as T;
}

function adapter(options: { error?: { code?: string; message: string }; response?: unknown } = {}) {
  const calls: { name: string; args: Record<string, unknown> }[] = []; let reads = 0; let invalidations = 0;
  const module = load<Record<string, (...args: unknown[]) => Promise<{ ok: boolean; status?: number }>>>("./db/admin-product-write-store.ts", {
    "@/lib/revalidate-storefront": { revalidateAfterPublish() {}, revalidateShopMerchandising() {} },
    "@/lib/db/admin-category-store": { assignableCategoryRefs: async () => [{ slug: "charger" }] },
    "@/lib/db/category-rules": { extraCategoryPathsToRevalidate: () => [] },
    "@/lib/db/admin-product-read-store": {
      getAdminProduct: async () => { reads++; return { ...document, _id: id, status: "published", adminRevision: "3", inventoryRevision: "2" }; },
      editorDocument: () => document, isProductSlugTaken: async () => false, bumpAdminProductsCache: () => { invalidations++; },
    },
    "@/lib/db/publish": publish, "@/lib/admin-product-input": input,
    "@/lib/supabase/server": { getServiceClient: () => ({
      from() { throw new Error("Direct mutation forbidden"); },
      async rpc(name: string, args: Record<string, unknown>) { calls.push({ name, args }); return {
        data: options.response === undefined ? { ok: true, id, admin_revision: "4", inventory_revision: "2", membership_revision: "0", manual_collection_ids: [], quantity: 8, stock_status: "in-stock" } : options.response,
        error: options.error ?? null,
      }; },
    }) },
  });
  return { module, calls, reads: () => reads, invalidations: () => invalidations };
}

describe("actual product adapter fails closed", () => {
  it("retains initial inventory as explicit draft intent when create omits it", async () => {
    const subject = adapter();
    assert.equal((await subject.module.createAdminProduct(document)).ok, true);
    const written = subject.calls[0].args.p_document as publish.ProductDocument;
    assert.equal(JSON.stringify(written.inventoryIntent), JSON.stringify({ mode: "adjust", expectedRevision: "0", quantity: 8, stockStatus: "in-stock" }));
  });
  it("rejects malformed input before querying or mutating", async () => {
    const subject = adapter();
    assert.equal((await subject.module.saveAdminProduct(id, { ...document, quantity: -1 }, [], "3")).status, 400);
    assert.equal((await subject.module.publishAdminProduct(id, document, "wrong", "3")).status, 400);
    assert.equal(subject.reads(), 0); assert.equal(subject.calls.length, 0);
  });
  it("uses a single v2 transaction for draft content and memberships, without moderation data", async () => {
    const subject = adapter(); const result = await subject.module.saveAdminProduct(id, { ...document, costPrice: 50, isDemo: true, reviews: [], collectionIntent: { mode: "adjust", expectedRevision: "0" } }, [collection], "3");
    assert.equal(result.ok, true); assert.equal(subject.calls.length, 1);
    assert.equal(subject.calls[0].name, "admin_write_product_v2");
    assert.equal(subject.calls[0].args.p_expected_admin_revision, "3");
    assert.equal(JSON.stringify(subject.calls[0].args.p_collection_ids), JSON.stringify([collection]));
    assert.equal(Object.hasOwn(subject.calls[0].args.p_document as object, "reviews"), false);
  });
  for (const error of [{ code: "PGRST202", message: "missing" }, { code: "42501", message: "denied" }, { code: "40001", message: "CONFLICT: stale admin_write_product_v2" }]) {
    it(`does not fall back when v2 returns ${error.code}`, async () => {
      const subject = adapter({ error }); const result = await subject.module.publishAdminProduct(id, document, null, "3");
      assert.equal(result.status, error.code === "40001" ? 409 : 503);
      assert.equal(subject.calls.length, 1); assert.equal(subject.calls[0].name, "admin_write_product_v2"); assert.equal(subject.invalidations(), 0);
    });
  }
  for (const response of [null, {}, { ok: "yes" }, { ok: true, id, admin_revision: "4", inventory_revision: "2", quantity: -1, stock_status: "in-stock" }, { ok: true, id: collection, admin_revision: "4", inventory_revision: "2", quantity: 8, stock_status: "in-stock" }]) {
    it(`reports uncertain malformed write success ${JSON.stringify(response)}`, async () => {
      const subject = adapter({ response }); assert.equal((await subject.module.saveAdminProduct(id, document, null, "3")).status, 502); assert.equal(subject.invalidations(), 0);
    });
  }
});

describe("actual authenticated product routes reject before mutation", () => {
  function routes(auth = true) {
    let mutations = 0;
    const store = new Proxy({}, { get: () => async () => { mutations++; return { ok: true }; } });
    const dependencies = {
      "@/lib/admin-api-observability": { withAdminApiObservability: (_label: string, handler: unknown) => handler },
      "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
      "@/lib/admin": { isAdminRequest: () => auth }, "@/lib/admin-product-input": input, "@/lib/db/admin-store": store,
    };
    return { ...load<{ POST: (request: Request) => Promise<Response> }>("../../../apps/admin/app/api/admin/products/route.ts", dependencies),
      ...load<{ PATCH: (request: Request, context: unknown) => Promise<Response> }>("../../../apps/admin/app/api/admin/products/[id]/route.ts", dependencies), count: () => mutations };
  }
  it("requires authorization before even parsing malformed bodies", async () => {
    const subject = routes(false);
    assert.equal((await subject.POST(new Request("http://localhost/api/admin/products", { method: "POST", body: "invalid" }))).status, 401);
    assert.equal(subject.count(), 0);
  });
  it("returns 400 for malformed JSON/doc/action/collections without adapter calls", async () => {
    const subject = routes();
    for (const body of ["invalid", "null", "[]", JSON.stringify({ action: "typo", doc: document, expectedAdminRevision: "3" }), JSON.stringify({ action: "save", doc: { ...document, price: null }, expectedAdminRevision: "3" }), JSON.stringify({ action: "save", doc: document, collectionIds: {}, expectedAdminRevision: "3" })]) {
      assert.equal((await subject.PATCH(new Request(`http://localhost/api/admin/products/${id}`, { method: "PATCH", body }), { params: Promise.resolve({ id }) })).status, 400);
    }
    assert.equal((await subject.POST(new Request("http://localhost/api/admin/products", { method: "POST", body: JSON.stringify({ doc: null }) }))).status, 400);
    assert.equal(subject.count(), 0);
  });
});
