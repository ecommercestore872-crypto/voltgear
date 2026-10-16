import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { shouldBuildVercelProject } from "./vercel-build-scope.mjs";

describe("Vercel monorepo build scope", () => {
  test("builds only the application whose source changed", () => {
    assert.equal(
      shouldBuildVercelProject("storefront", ["apps/storefront/app/page.tsx"]),
      true,
    );
    assert.equal(
      shouldBuildVercelProject("admin", ["apps/storefront/app/page.tsx"]),
      false,
    );
    assert.equal(
      shouldBuildVercelProject("storefront", ["apps/admin/app/admin/page.tsx"]),
      false,
    );
    assert.equal(
      shouldBuildVercelProject("admin", ["apps/admin/app/admin/page.tsx"]),
      true,
    );
  });

  test("rebuilds both applications for shared source and dependency changes", () => {
    for (const target of ["storefront", "admin"]) {
      assert.equal(
        shouldBuildVercelProject(target, ["packages/shared/lib/types.ts"]),
        true,
      );
      assert.equal(shouldBuildVercelProject(target, ["package-lock.json"]), true);
      assert.equal(
        shouldBuildVercelProject(target, ["scripts/vercel-ignore-build.mjs"]),
        true,
      );
    }
  });

  test("skips application builds for documentation and database-only changes", () => {
    const files = ["docs/runbook.md", "supabase/migrations/20261016_example.sql"];
    assert.equal(shouldBuildVercelProject("storefront", files), false);
    assert.equal(shouldBuildVercelProject("admin", files), false);
  });

  test("normalizes Windows paths and fails safe for unknown input", () => {
    assert.equal(
      shouldBuildVercelProject("admin", ["apps\\admin\\app\\page.tsx"]),
      true,
    );
    assert.equal(shouldBuildVercelProject("unknown", ["docs/readme.md"]), true);
    assert.equal(shouldBuildVercelProject("storefront", []), true);
  });
});
