import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProductActionRequest } from "./admin-product-action-rules";

const document = { name: "Power Bank", slug: "power-bank" };
const collectionIds = ["featured", "travel"];

describe("buildProductActionRequest", () => {
  it("builds the collection create request", () => {
    const request = buildProductActionRequest({
      action: "create",
      id: undefined,
      document,
      collectionIds,
      expectedAdminRevision: "4",
    });

    assert.deepEqual(request, {
      path: "/api/admin/products",
      init: {
        method: "POST",
        body: JSON.stringify({
          doc: document,
          collectionIds,
        }),
      },
    });
  });

  for (const action of ["save", "publish", "unpublish", "discard"] as const) {
    it(`builds the ${action} request for an existing product`, () => {
      const request = buildProductActionRequest({
        action,
        id: "product-123",
        document,
        collectionIds,
        expectedAdminRevision: "9007199254740993",
      });

      assert.deepEqual(request, {
        path: "/api/admin/products/product-123",
        init: {
          method: "PATCH",
          body: JSON.stringify({
            action,
            doc: document,
            collectionIds,
            expectedAdminRevision: "9007199254740993",
          }),
        },
      });
    });
  }

  it("builds a bodyless delete request", () => {
    const request = buildProductActionRequest({
      action: "delete",
      id: "product-123",
      document,
      collectionIds,
      expectedAdminRevision: "4",
    });

    assert.deepEqual(request, {
      path: "/api/admin/products/product-123",
      init: { method: "DELETE" },
    });
  });

  it("preserves the no-op behavior when an existing-product action has no id", () => {
    const request = buildProductActionRequest({
      action: "save",
      id: undefined,
      document,
      collectionIds,
    });

    assert.equal(request, null);
  });

  it("copies collection ids so callers cannot mutate the request later", () => {
    const request = buildProductActionRequest({
      action: "create",
      id: undefined,
      document,
      collectionIds,
    });

    collectionIds.push("new-later");

    const body = JSON.parse(request?.init.body ?? "{}") as {
      collectionIds?: string[];
    };
    assert.deepEqual(body.collectionIds, ["featured", "travel"]);
  });
});
