import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkoutValidationCategoryFromHttp,
  validationCategoryFromFieldName,
} from "./checkout-client-rules";

describe("validationCategoryFromFieldName", () => {
  it("maps known checkout fields", () => {
    assert.equal(validationCategoryFromFieldName("name"), "name");
    assert.equal(validationCategoryFromFieldName("postal"), "other");
  });
});

describe("checkoutValidationCategoryFromHttp", () => {
  it("maps HTTP statuses to categories", () => {
    assert.equal(checkoutValidationCategoryFromHttp(409), "price_changed");
    assert.equal(
      checkoutValidationCategoryFromHttp(400, "Your cart is empty."),
      "empty_cart",
    );
    assert.equal(checkoutValidationCategoryFromHttp(500, "boom"), null);
  });
});
