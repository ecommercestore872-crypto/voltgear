import { test, describe } from "node:test";
import assert from "node:assert";
import { normalizePhone } from "./messaging.js";

describe("Pakistani Phone Number Normalization Regression", () => {

  test("Must accept multiple valid spacing and prefix variations and canonicalize to E.164", () => {
    const validFormats = [
      "03414043446",
      "0341 4043446",
      "0341-4043446",
      "+923414043446",
      "+92 3414043446",
      "+92 341 4043446",
      "+92-341-4043446",
      "92 341 4043446"
    ];

    const CANONICAL = "+923414043446";

    for (const raw of validFormats) {
      assert.strictEqual(
        normalizePhone(raw),
        CANONICAL,
        `Failed to parse valid phone format: ${raw}`
      );
    }
  });

  test("Must reject mathematically or structurally invalid inputs", () => {
    const invalidFormats = [
      "123",
      "03123",
      "+921234567890",
      "+92341404",
      "abcdefghijk",
      ""
    ];

    for (const raw of invalidFormats) {
      assert.strictEqual(
        normalizePhone(raw),
        null,
        `Erroneously validated invalid phone string: ${raw}`
      );
    }
  });
});
