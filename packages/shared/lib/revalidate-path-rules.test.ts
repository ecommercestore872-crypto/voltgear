import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isAdminCachePath } from "./revalidate-path-rules";

describe("isAdminCachePath", () => {
  it("only /admin paths stay on the admin app cache", () => {
    assert.equal(isAdminCachePath("/admin/products"), true);
    assert.equal(isAdminCachePath("/products"), false);
    assert.equal(isAdminCachePath("/"), false);
  });
});
