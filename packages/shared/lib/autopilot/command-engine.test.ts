import { calculatePriorityScore, deduplicateExceptions } from "./command-engine";
import { OperationalException } from "./command-types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runCommandCenterTests() {
  console.log("🧪 Running Automation 5 Owner Command Center Test Suite...\n");
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

  const ex1: OperationalException = {
    id: "ex_1",
    dedupKey: "POSTEX_AUTH_FAIL",
    domain: "FULFILLMENT",
    severity: "CRITICAL",
    title: "PostEx Authentication Failure",
    summary: "Unable to authenticate with PostEx API v3",
    amountAtRisk: 50000,
    occurrenceCount: 1,
    status: "OPEN",
    recommendedAction: "Fix API Token",
    actionType: "RETRY_BOOKING",
    entityId: "postex_config",
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  const ex2: OperationalException = {
    id: "ex_2",
    dedupKey: "ADDRESS_INCOMPLETE:VG-1002",
    domain: "DELIVERY",
    severity: "MEDIUM",
    title: "Incomplete Address",
    summary: "Missing house number",
    amountAtRisk: 2500,
    occurrenceCount: 1,
    status: "OPEN",
    recommendedAction: "Request Address Update",
    actionType: "FIX_ADDRESS",
    entityId: "VG-1002",
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  // 1. Priority Scoring Test
  test("Priority Scoring: CRITICAL exception ranks higher than MEDIUM", () => {
    const score1 = calculatePriorityScore(ex1);
    const score2 = calculatePriorityScore(ex2);
    assert(score1 > score2, `Expected CRITICAL score (${score1}) > MEDIUM score (${score2})`);
  });

  // 2. Deduplication Test
  test("Deduplication: Merges identical dedupKeys and increments occurrence count", () => {
    const list = [ex1];
    const updated = deduplicateExceptions(list, { ...ex1, id: "ex_3" });
    assert(updated.length === 1, `Expected 1 deduplicated item, got ${updated.length}`);
    assert(updated[0].occurrenceCount === 2, `Expected occurrence count 2, got ${updated[0].occurrenceCount}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Owner Command Center tests PASSED.`);
  if (passed !== total) process.exit(1);
}
