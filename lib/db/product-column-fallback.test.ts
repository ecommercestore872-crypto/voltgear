import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { missingSchemaColumn, omitColumn } from "./product-column-fallback";

describe("missingSchemaColumn", () => {
  it("reads the column from a PostgREST schema-cache error", () => {
    assert.equal(
      missingSchemaColumn({
        code: "PGRST204",
        message: "Could not find the 'color_enabled' column of 'products' in the schema cache",
      }),
      "color_enabled"
    );
  });

  it("returns null when the error is unrelated", () => {
    assert.equal(missingSchemaColumn({ code: "23505", message: "duplicate key" }), null);
  });
});

describe("omitColumn", () => {
  it("removes only the missing field", () => {
    const row = omitColumn({ name: "Hoodie", color_enabled: true, price: 1 }, "color_enabled");
    assert.equal("color_enabled" in row, false);
    assert.equal(row.name, "Hoodie");
  });
});
