import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as input from "../admin-product-input";
import * as collectionInput from "../collection-input";
import * as collectionRules from "./collection-rules";

const id = "11111111-1111-4111-8111-111111111111";
const product = "22222222-2222-4222-8222-222222222222";
const snapshot = { id, name: "Synthetic collection", slug: "synthetic-collection", description: null, mode: "manual", autoRule: null,
  active: true, homeSlot: null, sortOrder: 0, revision: "4", productIds: [product],
  slotRevisions: { bestsellers: "0", featured: "1", offers: "2" } };
function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Request, Response, URL,
    require(name: string) { if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`); return dependencies[name]; } });
  return exports as T;
}
function subject(options: { error?: { code?: string; message: string }; data?: unknown } = {}) {
  const calls: { name: string; args?: Record<string, unknown> }[] = [];
  const invalidations: string[][] = [];
  const dependencies = {
    "next/cache": { unstable_cache: (fn: unknown) => fn },
    "@/lib/storefront-cache": {}, "@/lib/revalidate-storefront": { revalidateShopMerchandising: (...paths: string[]) => invalidations.push(paths) },
    "@/lib/db/collection-rules": collectionRules,
    "@/lib/db/home-collection-batch": {}, "@/lib/db/map": {}, "@/lib/db/store": {},
    "@/lib/admin-product-input": input, "@/lib/collection-input": collectionInput,
    "@/lib/supabase/server": { getServiceClient: () => ({
      from() { throw new Error("Direct table mutation or follow-up read is forbidden"); },
      rpc: async (name: string, args?: Record<string, unknown>) => {
        calls.push({ name, args });
        const data = Object.hasOwn(options, "data") ? options.data : name === "admin_collections_snapshot_v1" ? [snapshot]
          : name === "admin_collection_snapshot_v1" ? snapshot
          : { ok: true, id, revision: "4", previousSlug: "old-slug", collection: snapshot, ...(args?.p_action === "delete" ? { deleted: true } : {}) };
        return { data, error: options.error ?? null };
      },
    }) },
  };
  const module = load<Record<string, (...args: unknown[]) => Promise<any>>>("./collection-store.ts", dependencies);
  return { module, calls, invalidations };
}

describe("atomic collection store commands", () => {
  it("uses one versioned command with original tokens and no direct/follow-up mutation", async () => {
    const api = subject();
    const result = await api.module.updateAdminCollection(id, { name: "Edited", productIds: [product], expectedRevision: "3" });
    assert.equal(result.ok, true); assert.equal(result.collection.revision, "4");
    assert.equal(api.calls.length, 1); assert.equal(api.calls[0].name, "admin_write_collection_v1");
    assert.equal(api.calls[0].args?.p_expected_revision, "3");
    assert.deepEqual(JSON.parse(JSON.stringify(api.calls[0].args?.p_document)), { name: "Edited", productIds: [product] });
    assert.ok(api.invalidations[0].includes("/collections/old-slug"));
    assert.ok(api.invalidations[0].includes("/collections/synthetic-collection"));
  });
  it("validates original input before any database access", async () => {
    const api = subject();
    for (const bad of [null, [], { expectedRevision: "0", active: "false" }, { expectedRevision: "0", productIds: [product, product] }, { name: "Bad", mode: "wrong" }]) {
      assert.equal((await api.module.updateAdminCollection(id, bad)).status, 400);
    }
    assert.equal((await api.module.deleteAdminCollection(id)).status, 400);
    assert.equal(api.calls.length, 0); assert.equal(api.invalidations.length, 0);
  });
  for (const code of ["40001", "55P03", "40P01", "23505", "PGRST202", "42501", "42883", "42703"]) {
    it(`fails closed on ${code} without invalidating caches or retrying`, async () => {
      const api = subject({ error: { code, message: "Synthetic private failure" } });
      const result = await api.module.updateAdminCollection(id, { name: "Edited", expectedRevision: "3" });
      assert.equal(result.status, ["40001", "55P03", "40P01", "23505"].includes(code) ? 409 : 503);
      assert.equal(api.calls.length, 1); assert.equal(api.invalidations.length, 0);
      assert.equal(result.error.includes("private"), false);
    });
  }
  for (const data of [null, {}, { ok: true, id, revision: "4", previousSlug: null, collection: { ...snapshot, revision: "5" } },
    { ok: true, id, revision: "4", previousSlug: null, collection: { ...snapshot, productIds: ["bad"] } }]) {
    it(`treats malformed committed response ${JSON.stringify(data)} as uncertain`, async () => {
      const api = subject({ data });
      assert.equal((await api.module.updateAdminCollection(id, { name: "Edited", expectedRevision: "3" })).status, 502);
      assert.equal(api.invalidations.length, 0);
    });
  }
  it("confirms a versioned delete and invalidates only after confirmation", async () => {
    const api = subject();
    assert.equal((await api.module.deleteAdminCollection(id, "3")).deleted, true);
    assert.equal(api.calls[0].args?.p_expected_revision, "3"); assert.equal(api.invalidations.length, 1);
  });
  it("reads complete snapshots without seeding, separately fetching children or inventing empty baselines", async () => {
    const api = subject();
    assert.equal((await api.module.getAdminCollection(id)).revision, "4");
    assert.equal((await api.module.listAdminCollections()).length, 1);
    assert.deepEqual(api.calls.map((call) => call.name), ["admin_collection_snapshot_v1", "admin_collections_snapshot_v1"]);
    await assert.rejects(subject({ data: { ...snapshot, productIds: null } }).module.getAdminCollection(id));
    await assert.rejects(subject({ data: null }).module.listAdminCollections());
  });
});

describe("coherent product editor read", () => {
  function reader(data: unknown) {
    const calls: string[] = [];
    const module = load<{ getAdminProductForEditor: (id: string) => Promise<any> }>("./admin-product-read-store.ts", {
      "next/cache": { unstable_cache: (fn: unknown) => fn }, "@/lib/revalidate-storefront": {},
      "@/lib/db/map": { mapProduct: (row: Record<string, unknown>) => ({ _id: row.id }) }, "@/lib/admin-product-input": input,
      "@/lib/supabase/server": { getServiceClient: () => ({
        from() { throw new Error("Separate product/member reads forbidden"); },
        rpc: async (name: string) => { calls.push(name); return { data, error: null }; },
      }) },
    });
    return { module, calls };
  }
  it("uses the same SQL snapshot for document, membership and all revision strings", async () => {
    const api = reader({ id: product, admin_revision: "9007199254740993", inventory_revision: "1", membership_revision: "2", manual_collection_ids: [id] });
    const result = await api.module.getAdminProductForEditor(product);
    assert.equal(result.adminRevision, "9007199254740993"); assert.equal(result.membershipRevision, "2");
    assert.deepEqual(JSON.parse(JSON.stringify(result.manualCollectionIds)), [id]);
    assert.deepEqual(api.calls, ["admin_product_editor_snapshot_v1"]);
  });
  for (const data of [{ id: product }, { id: product, admin_revision: "0", inventory_revision: "0", membership_revision: "0", manual_collection_ids: null }]) {
    it("refuses incomplete editor snapshots", async () => { await assert.rejects(reader(data).module.getAdminProductForEditor(product)); });
  }
});
