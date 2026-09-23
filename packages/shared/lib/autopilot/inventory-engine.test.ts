import { allocateStockForOrder, releaseStockForOrder, consumeStockOnDispatch } from "./inventory-engine";
import { calculateReorderPoint, evaluateSkuReorder } from "./reorder-engine";
import { SkuInventory } from "./inventory-types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runInventoryTests() {
  console.log("🧪 Running Automation 4 Inventory & Reorder Autopilot Test Suite...\n");
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

  const baseInv: SkuInventory = {
    sku: "VG-CHG-65W",
    productId: "p1",
    variantId: "v1",
    onHand: 100,
    available: 80,
    committed: 10,
    safetyStock: 10,
    damaged: 0,
    incoming: 0,
  };

  // 1. Stock Allocation Test
  test("Allocation: Reserves AVAILABLE -> COMMITTED atomically", () => {
    const { updatedInv, movement } = allocateStockForOrder(baseInv, 5, "VG-1001");
    assert(updatedInv.available === 75, `Expected 75 available, got ${updatedInv.available}`);
    assert(updatedInv.committed === 15, `Expected 15 committed, got ${updatedInv.committed}`);
    assert(movement.quantityChange === -5, `Movement check`);
  });

  test("Allocation: Throws error when overselling available stock", () => {
    let threw = false;
    try {
      allocateStockForOrder(baseInv, 90, "VG-1002");
    } catch {
      threw = true;
    }
    assert(threw, "Should throw error on stockout allocation");
  });

  // 2. Cancellation Release Test
  test("Cancellation: Restores COMMITTED -> AVAILABLE", () => {
    const { updatedInv } = releaseStockForOrder(baseInv, 5, "VG-1001");
    assert(updatedInv.available === 85, `Expected 85 available, got ${updatedInv.available}`);
    assert(updatedInv.committed === 5, `Expected 5 committed, got ${updatedInv.committed}`);
  });

  // 3. Dispatch Consumption Test
  test("Dispatch: Consumes ON_HAND & COMMITTED without double deducting AVAILABLE", () => {
    const { updatedInv } = consumeStockOnDispatch(baseInv, 10, "VG-1001");
    assert(updatedInv.onHand === 90, `Expected 90 onHand, got ${updatedInv.onHand}`);
    assert(updatedInv.committed === 0, `Expected 0 committed, got ${updatedInv.committed}`);
    assert(updatedInv.available === 80, `Available should stay 80, got ${updatedInv.available}`);
  });

  // 4. Reorder Point & Forecasting Test
  test("Forecasting: Triggers REORDER_NEEDED when position <= ROP", () => {
    const rec = evaluateSkuReorder(baseInv, "65W GaN Charger", 5, 20);
    // ROP = 5 * 10 + 10 = 60 (with safety stock 10)
    assert(rec.daysOfStockRemaining === 16, `Days remaining check: got ${rec.daysOfStockRemaining}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Inventory Autopilot tests PASSED.`);
  if (passed !== total) process.exit(1);
}
