import { normalizeCourierStatus, classifyRescueReason, generateRescueToken } from "./rescue-engine";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runDeliveryRescueTests() {
  console.log("🧪 Running Automation 2 Delivery Rescue Test Suite...\n");
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

  // 1. PostEx Status Normalization Tests
  test("Normalize: PostEx Delivered -> DELIVERED", () => {
    const res = normalizeCourierStatus("Successful Delivery", "POSTEX");
    assert(res === "DELIVERED", `Got ${res}`);
  });

  test("Normalize: PostEx Out for Delivery -> OUT_FOR_DELIVERY", () => {
    const res = normalizeCourierStatus("Out For Delivery", "POSTEX");
    assert(res === "OUT_FOR_DELIVERY", `Got ${res}`);
  });

  // 2. Leopards Status Normalization Tests
  test("Normalize: Leopards Returned to Shipper -> RETURNED", () => {
    const res = normalizeCourierStatus("Returned to Shipper", "LEOPARDS");
    assert(res === "RETURNED", `Got ${res}`);
  });

  test("Normalize: Leopards Unreachable -> DELIVERY_ATTEMPT_FAILED", () => {
    const res = normalizeCourierStatus("Consignee Unreachable", "LEOPARDS");
    assert(res === "DELIVERY_ATTEMPT_FAILED", `Got ${res}`);
  });

  // 3. Failure Reason Classification Tests
  test("Classify: Phone unreachable -> PHONE_UNREACHABLE", () => {
    const reason = classifyRescueReason("Customer phone number was switched off during rider call");
    assert(reason === "PHONE_UNREACHABLE", `Got ${reason}`);
  });

  test("Classify: Customer refused -> CUSTOMER_REFUSED", () => {
    const reason = classifyRescueReason("Customer refused to accept COD parcel at doorstep");
    assert(reason === "CUSTOMER_REFUSED", `Got ${reason}`);
  });

  // 4. Secure Token Generation Tests
  test("Token: Generates valid vg_rescue token prefix", () => {
    const token = generateRescueToken("VG-1001");
    assert(token.startsWith("vg_rescue_vg-1001_"), `Got ${token}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Delivery Rescue tests PASSED.`);
  if (passed !== total) process.exit(1);
}
