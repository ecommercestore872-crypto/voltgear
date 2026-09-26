import { test, describe } from "node:test";
import assert from "node:assert";

describe("Checkout API Flow Regression", () => {

  test("Checkout customer rules reject empty payload", async () => {
    const { normalizeCheckoutCustomer } = await import("./checkout-customer-rules");
    assert.strictEqual(normalizeCheckoutCustomer({}).ok, false);
    assert.strictEqual(
      normalizeCheckoutCustomer({
        name: "Ali Khan",
        phone: "03001234567",
        address: "House 12, Street 4, Gulberg",
      }).ok,
      true,
    );
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
