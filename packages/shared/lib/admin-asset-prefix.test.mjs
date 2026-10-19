import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminAssetPrefix } from "./admin-asset-prefix.mjs";

describe("adminAssetPrefix", () => {
  it("keeps preview and development assets on their own origin", () => {
    const origin = "https://voltgear-admin-pi.vercel.app";

    assert.equal(
      adminAssetPrefix({
        VERCEL_ENV: "preview",
        NEXT_PUBLIC_ADMIN_ASSET_ORIGIN: origin,
      }),
      undefined,
    );
    assert.equal(
      adminAssetPrefix({
        VERCEL_ENV: "development",
        NEXT_PUBLIC_ADMIN_ASSET_ORIGIN: origin,
      }),
      undefined,
    );
  });

  it("uses the configured stable asset origin only in production", () => {
    assert.equal(
      adminAssetPrefix({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_ADMIN_ASSET_ORIGIN: " https://voltgear-admin-pi.vercel.app/ ",
      }),
      "https://voltgear-admin-pi.vercel.app",
    );
  });

  it("does not configure an empty production asset origin", () => {
    assert.equal(adminAssetPrefix({ VERCEL_ENV: "production" }), undefined);
  });
});
