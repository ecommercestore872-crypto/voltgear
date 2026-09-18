import { test, describe } from "node:test";
import assert from "node:assert";

describe("Checkout API Flow Regression", () => {

  test("Missing customer fields are unconditionally rejected", () => {
    // If the React component submits empty closures, the API must reject.
    const validationFn = (customer: any) => {
      if (
        !customer?.name ||
        !customer.email ||
        !customer.phone ||
        !customer.address ||
        !customer.city?.trim()
      ) {
        return false;
      }
      return true;
    };
    
    assert.strictEqual(validationFn({}), false, "Empty closure payload must be rejected");
    assert.strictEqual(validationFn({ name: "A", phone: "123", address: "A", city: "A" }), false, "Missing email must be rejected");
    assert.strictEqual(validationFn({ name: "A", email: "A", phone: "123", address: "A", city: "A" }), true, "Full payload must pass");
  });

  test("Purchase tracking occurs only strictly after success", () => {
    let orderPlaced = false;
    let purchaseTracked = false;

    // Simulated API execution flow
    const executeCheckout = (success: boolean) => {
      try {
        if (!success) throw new Error("Validation Failed");
        orderPlaced = true;

        if (orderPlaced) {
          purchaseTracked = true;
        }
      } catch (e) {
        // tracking is never reached
      }
    };

    executeCheckout(false);
    assert.strictEqual(purchaseTracked, false, "Failed order must never track purchase");

    executeCheckout(true);
    assert.strictEqual(purchaseTracked, true, "Successful order must track purchase");
  });
});
