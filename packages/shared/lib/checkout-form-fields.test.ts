import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateCheckoutFormField,
  validateCheckoutFormFields,
} from "./checkout-form-fields";

describe("checkout-form-fields", () => {
  it("flags short name on blur rules", () => {
    assert.equal(validateCheckoutFormField("name", "A"), "Enter your full name (at least 2 characters).");
    assert.equal(validateCheckoutFormField("name", "Ali Khan"), null);
  });

  it("flags invalid phone", () => {
    assert.match(
      validateCheckoutFormField("phone", "123") ?? "",
      /Pakistani mobile/,
    );
    assert.equal(validateCheckoutFormField("phone", "03001234567"), null);
  });

  it("validateCheckoutFormFields returns empty for good COD payload", () => {
    const errors = validateCheckoutFormFields({
      name: "Ali Khan",
      phone: "03001234567",
      address: "House 12, Street 4, DHA",
    });
    assert.deepEqual(errors, {});
  });
});
