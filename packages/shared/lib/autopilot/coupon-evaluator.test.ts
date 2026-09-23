import { evaluateDiscountCoupon, evaluateBankPaymentOffer } from "./coupon-evaluator";
import { DiscountCoupon, BankPaymentOffer } from "./promotion-types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runCouponEvaluatorTests() {
  console.log("🧪 Running VoltGear Coupon & Bank Offer Evaluator Test Suite...\n");
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    }
  }

  const validCoupon: DiscountCoupon = {
    id: "c1",
    code: "VOLT10",
    type: "PERCENTAGE",
    value: 10,
    minOrderAmount: 3000,
    maxUsageCount: 100,
    usageCount: 10,
    startsAt: "2020-01-01T00:00:00Z",
    expiresAt: "2030-01-01T00:00:00Z",
    isActive: true,
  };

  const bankOffer: BankPaymentOffer = {
    id: "b1",
    bankName: "EasyPaisa",
    discountPercentage: 10,
    maxDiscountAmount: 500,
    isActive: true,
  };

  // 1. Coupon Evaluation Test
  test("Coupon: Applies 10% discount when order meets minimum amount", () => {
    const res = evaluateDiscountCoupon(validCoupon, 5000);
    assert(res.valid === true, "Should be valid");
    assert(res.discountAmount === 500, `Expected Rs 500 discount, got Rs ${res.discountAmount}`);
    assert(res.finalOrderTotal === 4500, `Expected Rs 4,500 final total, got Rs ${res.finalOrderTotal}`);
  });

  test("Coupon: Rejects coupon if order total < minimum required", () => {
    const res = evaluateDiscountCoupon(validCoupon, 2000);
    assert(res.valid === false, "Should be invalid due to min order amount");
    assert(res.discountAmount === 0, "Discount should be 0");
  });

  // 2. Bank Offer Evaluation Test
  test("Bank Offer: Applies bank discount with max cap enforcement", () => {
    const res = evaluateBankPaymentOffer(bankOffer, 10000); // 10% of 10k = 1000, capped at 500
    assert(res.valid === true, "Should be valid");
    assert(res.discountAmount === 500, `Expected max cap Rs 500 discount, got Rs ${res.discountAmount}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Coupon & Bank Offer tests PASSED.`);
  if (passed !== total) process.exit(1);
}
