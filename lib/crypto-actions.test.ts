import { signActionUrl, verifyAction } from "./crypto-actions";

console.log("🚀 Running Cryptographic Edge Case Testing for 1-Tap Fulfillment...\n");

let passed = 0;
let total = 0;

function assertCondition(name: string, condition: boolean) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } else {
    console.error(`❌ [FAIL] ${name}`);
  }
}

try {
  const orderId = "TEST-ORDER-123";
  const action = "shipped";
  
  // 1. Happy Path Generation
  const url = signActionUrl(orderId, action, 60);
  const urlObj = new URL(url);
  const sig = urlObj.searchParams.get("sig")!;
  const exp = urlObj.searchParams.get("exp")!;
  
  assertCondition("Valid URL Generation: Generates proper signature and expiration parameters", !!sig && !!exp);
  
  // 2. Happy Path Verification
  const valid = verifyAction(sig, orderId, action, exp);
  assertCondition("Happy Path: Valid signature properly validates against original payload", valid);

  // 3. Fake Order ID Tampering
  const tamperedOrder = verifyAction(sig, "HACKED-ORDER-ID", action, exp);
  assertCondition("Tamper Resistance A: Reject payload with mismatched Order ID", tamperedOrder === false);

  // 4. Fake Action Tampering
  const tamperedAction = verifyAction(sig, orderId, "refunded", exp);
  assertCondition("Tamper Resistance B: Reject payload with mismatched Database Action", tamperedAction === false);

  // 5. Fake Signature Tampering
  const tamperedSig = verifyAction(sig.substring(0, sig.length - 1) + "x", orderId, action, exp);
  assertCondition("Cryptographic Integrity: Reject payload with forged or modified signature", tamperedSig === false);

  // 6. Expiration Handling (Past Date)
  const expiredUrl = signActionUrl(orderId, action, -10); // created 10 minutes in the past
  const expUrlObj = new URL(expiredUrl);
  const expiredSig = expUrlObj.searchParams.get("sig")!;
  const expiredTime = expUrlObj.searchParams.get("exp")!;
  
  const expiredCheck = verifyAction(expiredSig, orderId, action, expiredTime);
  assertCondition("Time-Box Security: Reject signatures that have surpassed the expiration window", expiredCheck === false);

  // 7. NaN / Malformed Expiration string
  const malformedCheck = verifyAction(sig, orderId, action, "invalid-time");
  assertCondition("Data Validation: Reject non-numeric or corrupted expiration timestamps", malformedCheck === false);

} catch (error) {
  console.error("Test execution crashed:", error);
}

console.log(`\n🎉 Results: ${passed}/${total} Edge Cases Passed.`);
