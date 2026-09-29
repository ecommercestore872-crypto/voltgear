import assert from "node:assert";
import { describe, test } from "node:test";

import {
  fallbackCategoryImageForSlug,
  resolveCategoryImagePath,
} from "./category-image-resolve";

describe("resolveCategoryImagePath", () => {
  test("uses static WebP fallback when DB image is empty", () => {
    assert.strictEqual(
      resolveCategoryImagePath(null, "smartwatch"),
      "/categories/smartwatch.webp",
    );
  });

  test("upgrades legacy PNG paths under /categories/", () => {
    assert.strictEqual(
      resolveCategoryImagePath("/categories/charger.png", "charger"),
      "/categories/charger.webp",
    );
  });

  test("keeps Cloudinary and absolute URLs", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/x.webp";
    assert.strictEqual(resolveCategoryImagePath(url, "smartwatch"), url);
  });

  test("fallbackCategoryImageForSlug maps microphones slug", () => {
    assert.strictEqual(
      fallbackCategoryImageForSlug("microphones"),
      "/categories/microphone.webp",
    );
  });
});
