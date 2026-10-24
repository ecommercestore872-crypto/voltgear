import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type DeleteResult = { ok: boolean; error?: string; status?: number };
type ProductFixture = { slug: string; images?: string[]; draft?: { images?: string[] } };

function harness(options: {
  product?: ProductFixture | null;
  error?: { message: string };
  waitForDelete?: Promise<{ error: { message: string } | null }>;
} = {}) {
  const events: { reads: string[]; deletes: string[]; clients: number; storage: number; cache: number; revalidation: string[][] } = {
    reads: [], deletes: [], clients: 0, storage: 0, cache: 0, revalidation: [],
  };
  const dependencies: Record<string, unknown> = {
    "@/lib/revalidate-storefront": {
      revalidateShopMerchandising: async (...paths: string[]) => { events.revalidation.push(paths); },
    },
    "@/lib/db/admin-category-store": {},
    "@/lib/db/category-rules": {},
    "@/lib/db/collection-rules": {},
    "@/lib/db/admin-product-read-store": {
      getAdminProduct: async (id: string) => {
        events.reads.push(id);
        return options.product === undefined ? { slug: "fixture-product" } : options.product;
      },
      bumpAdminProductsCache: () => { events.cache++; },
    },
    "@/lib/db/publish": {},
    "@/lib/admin-product-input": {},
    "@/lib/supabase/server": {
      getServiceClient: (configuration: { admin?: boolean }) => {
        events.clients++;
        assert.equal(configuration?.admin, true);
        return {
          get storage() { events.storage++; throw new Error("Storage must not be accessed during product deletion"); },
          from: (table: string) => {
            assert.equal(table, "products");
            return { delete: () => ({ eq: async (column: string, id: string) => {
              assert.equal(column, "id");
              events.deletes.push(id);
              return options.waitForDelete ?? { error: options.error ?? null };
            } }) };
          },
        };
      },
    },
  };
  const exports = {} as { deleteAdminProduct: (id: string) => Promise<DeleteResult> };
  const source = readFileSync(new URL("./admin-product-write-store.ts", import.meta.url), "utf8");
  runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    exports,
    require(name: string) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return { ...exports, events };
}

describe("product deletion retains potentially shared media", () => {
  it("deletes only the requested product and preserves cache/revalidation behavior", async () => {
    const subject = harness();
    assert.equal((await subject.deleteAdminProduct("product-a")).ok, true);
    assert.deepEqual(subject.events.reads, ["product-a"]);
    assert.deepEqual(subject.events.deletes, ["product-a"]);
    assert.equal(subject.events.clients, 1);
    assert.equal(subject.events.storage, 0);
    assert.equal(subject.events.cache, 1);
    assert.deepEqual(subject.events.revalidation[0], ["/", "/products", "/product/fixture-product", "/api/store/products", "/admin/products"]);
  });

  it("retains live/draft, duplicate, nested-path and external image bytes", async () => {
    const shared = "https://fixture.supabase.co/storage/v1/object/public/product-images/shared/photo.webp";
    const subject = harness({ product: {
      slug: "product-with-shared-image",
      images: [shared, "https://res.cloudinary.com/fixture/image/upload/shared.png"],
      draft: { images: [shared, "https://fixture.supabase.co/storage/v1/object/public/product-images/draft.jpg"] },
    } });
    assert.equal((await subject.deleteAdminProduct("product-a")).ok, true);
    assert.deepEqual(subject.events.deletes, ["product-a"]);
    assert.equal(subject.events.storage, 0);
    assert.equal(subject.events.clients, 1);
  });

  it("does not mutate or invalidate when the product is missing", async () => {
    const subject = harness({ product: null });
    const result = await subject.deleteAdminProduct("missing");
    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(subject.events.clients, 0);
    assert.deepEqual(subject.events.deletes, []);
    assert.equal(subject.events.cache, 0);
    assert.deepEqual(subject.events.revalidation, []);
  });

  it("retains media and does not report success or invalidate after database failure", async () => {
    const subject = harness({ error: { message: "Fixture deletion rejected" } });
    const result = await subject.deleteAdminProduct("product-a");
    assert.equal(result.ok, false);
    assert.equal(result.status, 500);
    assert.equal(subject.events.storage, 0);
    assert.equal(subject.events.cache, 0);
    assert.deepEqual(subject.events.revalidation, []);
  });

  it("waits for confirmed database success before invalidation", async () => {
    let finish!: (value: { error: null }) => void;
    const subject = harness({ waitForDelete: new Promise((resolve) => { finish = resolve; }) });
    const operation = subject.deleteAdminProduct("product-a");
    await Promise.resolve();
    assert.equal(subject.events.cache, 0);
    assert.deepEqual(subject.events.revalidation, []);
    finish({ error: null });
    assert.equal((await operation).ok, true);
    assert.equal(subject.events.cache, 1);
    assert.equal(subject.events.storage, 0);
  });
});
