import { reconcileCourierSettlement, ExpectedOrderRecord, RawCourierPayoutRecord } from "./settlement-engine";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runSettlementTests() {
  console.log("🧪 Running Automation 3 Settlement Autopilot Test Suite...\n");
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

  // 1. Perfect Match Test
  test("Reconcile: Clean Payout -> BALANCED", () => {
    const raw: RawCourierPayoutRecord[] = [
      { trackingNumber: "PX1001", orderId: "VG-1001", collectedCod: 4500, chargedShippingFee: 200 },
    ];
    const expected = new Map<string, ExpectedOrderRecord>([
      ["PX1001", { orderId: "VG-1001", trackingNumber: "PX1001", expectedCod: 4500, expectedShippingFee: 200 }],
    ]);

    const batch = reconcileCourierSettlement("SET-001", "POSTEX", "2026-09-03", raw, expected);
    assert(batch.status === "BALANCED", `Expected BALANCED, got ${batch.status}`);
    assert(batch.items[0].status === "RECONCILED", "Item should be RECONCILED");
    assert(batch.netAmountPaid === 4300, `Net payout check: got ${batch.netAmountPaid}`);
  });

  // 2. COD Underpaid Test
  test("Reconcile: COD Underpaid -> HAS_DISCREPANCIES & COD_UNDERPAID", () => {
    const raw: RawCourierPayoutRecord[] = [
      { trackingNumber: "PX1002", orderId: "VG-1002", collectedCod: 4000, chargedShippingFee: 200 },
    ];
    const expected = new Map<string, ExpectedOrderRecord>([
      ["PX1002", { orderId: "VG-1002", trackingNumber: "PX1002", expectedCod: 4500, expectedShippingFee: 200 }],
    ]);

    const batch = reconcileCourierSettlement("SET-002", "POSTEX", "2026-09-03", raw, expected);
    assert(batch.status === "HAS_DISCREPANCIES", `Expected HAS_DISCREPANCIES, got ${batch.status}`);
    assert(batch.items[0].discrepancyType === "COD_UNDERPAID", `Got ${batch.items[0].discrepancyType}`);
    assert(batch.items[0].discrepancyAmount === 500, `Expected 500 discrepancy, got ${batch.items[0].discrepancyAmount}`);
  });

  // 3. Shipping Fee Overcharged Test
  test("Reconcile: Shipping Fee Overcharged -> OVERCHARGED_FEE", () => {
    const raw: RawCourierPayoutRecord[] = [
      { trackingNumber: "PX1003", orderId: "VG-1003", collectedCod: 3000, chargedShippingFee: 350 },
    ];
    const expected = new Map<string, ExpectedOrderRecord>([
      ["PX1003", { orderId: "VG-1003", trackingNumber: "PX1003", expectedCod: 3000, expectedShippingFee: 200 }],
    ]);

    const batch = reconcileCourierSettlement("SET-003", "POSTEX", "2026-09-03", raw, expected);
    assert(batch.items[0].discrepancyType === "OVERCHARGED_FEE", `Got ${batch.items[0].discrepancyType}`);
    assert(batch.items[0].discrepancyAmount === 150, `Expected 150 overcharge, got ${batch.items[0].discrepancyAmount}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Settlement Autopilot tests PASSED.`);
  if (passed !== total) process.exit(1);
}
