import { calculateBreakevenRoas, evaluateProductAdAllocation, buildAdBudgetOverview } from "./ad-engine";
import { ProductAdMetrics } from "./ad-types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runAdEngineTests() {
  console.log("🧪 Running Automation 6 Ad Budget & Profitability Autopilot Test Suite...\n");
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

  const p1: ProductAdMetrics = {
    productId: "p1",
    productName: "65W GaN Charger",
    sku: "VG-CHG-65W",
    price: 5000,
    cogs: 2000,
    estimatedShippingCost: 250,
    rtoRatePercentage: 10,
    currentStock: 50,
    daysOfStockRemaining: 15,
    adSpend: 10000,
    pixelRoas: 3.5,
  };

  const pLowStock: ProductAdMetrics = {
    ...p1,
    productId: "p2",
    productName: "Low Stock Charger",
    daysOfStockRemaining: 2, // Out of stock imminent
  };

  // 1. Breakeven ROAS Calculation Test
  test("Breakeven ROAS: Calculates target ROAS based on price, COGS & RTO", () => {
    // Net profit = 5000 - 2000 - 250 - 500 (10% RTO) = 2250. Breakeven = 5000 / 2250 = 2.22x
    const roas = calculateBreakevenRoas(5000, 2000, 250, 10);
    assert(roas === 2.22, `Expected 2.22x breakeven ROAS, got ${roas}x`);
  });

  // 2. HERO WINNER Classification Test
  test("Allocation: Classifies high margin product as HERO_WINNER and allocates budget", () => {
    const rec = evaluateProductAdAllocation(p1, 10000);
    assert(rec.tier === "HERO_WINNER", `Expected HERO_WINNER tier, got ${rec.tier}`);
    assert(rec.recommendedDailyBudget === 6000, `Expected Rs 6,000 budget, got Rs ${rec.recommendedDailyBudget}`);
  });

  // 3. Low Stock Protection Test
  test("Protection: Pauses ad allocation if product has <= 3 days of stock remaining", () => {
    const rec = evaluateProductAdAllocation(pLowStock, 10000);
    assert(rec.tier === "PAUSE_IMMINENT", `Expected PAUSE_IMMINENT tier, got ${rec.tier}`);
    assert(rec.recommendedDailyBudget === 0, `Expected Rs 0 budget, got Rs ${rec.recommendedDailyBudget}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Ad Intelligence tests PASSED.`);
  if (passed !== total) process.exit(1);
}
