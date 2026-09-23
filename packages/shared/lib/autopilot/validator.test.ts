import {
  normalizePakistaniPhone,
  createCommercialSnapshot,
  resolveCourierCity,
  calculateParcelWeight,
  validateOrderForAutopilot,
} from "./validator";
import type { Order } from "@/lib/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ TEST FAILED: ${message}`);
  }
}

export async function runAutopilotTests() {
  console.log("🧪 Running Automation 1 Autopilot Test Suite...\n");
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

  // 1. Phone Normalization Tests
  test("Phone: Standard 0300 format -> 92300", () => {
    const res = normalizePakistaniPhone("03001234567");
    assert(res.isValid === true, "Should be valid");
    assert(res.normalized === "923001234567", `Got ${res.normalized}`);
  });

  test("Phone: +92 format with spaces -> 92300", () => {
    const res = normalizePakistaniPhone("+92 300 1234567");
    assert(res.isValid === true, "Should be valid");
    assert(res.normalized === "923001234567", `Got ${res.normalized}`);
  });

  test("Phone: Invalid phone format -> invalid", () => {
    const res = normalizePakistaniPhone("12345");
    assert(res.isValid === false, "Short phone should be invalid");
  });

  // 2. Commercial Snapshot Tests
  test("Commercial Snapshot: Freezes correct total and COD receivable", () => {
    const mockOrder: Order = {
      _id: "1",
      orderId: "VG-1001",
      subtotal: 5000,
      shipping: 200,
      total: 4700,
      payment: "cod",
      items: [],
      createdAt: new Date().toISOString(),
    };
    const snap = createCommercialSnapshot(mockOrder);
    assert(snap.subtotal === 5000, "Subtotal check");
    assert(snap.total === 4700, "Total check");
    assert(snap.codReceivable === 4700, "COD Receivable check");
  });

  test("Commercial Snapshot: Prepaid order has zero COD receivable", () => {
    const mockOrder: Order = {
      _id: "2",
      orderId: "VG-1002",
      subtotal: 3000,
      total: 3000,
      payment: "card",
      items: [],
      createdAt: new Date().toISOString(),
    };
    const snap = createCommercialSnapshot(mockOrder);
    assert(snap.codReceivable === 0, "Prepaid COD should be 0");
  });

  // 3. City Normalization Mapping Tests
  test("City: Lahore mapping -> LHR", () => {
    const res = resolveCourierCity("Lahore");
    assert(res.matched === true, "Should match");
    assert(res.cityCode === "LHR", "City code check");
  });

  test("City: D.G. Khan spelling variation -> DGK", () => {
    const res = resolveCourierCity("D.G. Khan");
    assert(res.matched === true, "Should match DG Khan");
    assert(res.cityCode === "DGK", "City code DGK check");
  });

  // 4. Full Autopilot Order Validation Engine Tests
  test("Validation: Clean Order -> AUTO_READY", () => {
    const mockOrder: Order = {
      _id: "10",
      orderId: "VG-2001",
      subtotal: 2500,
      total: 2500,
      payment: "cod",
      customer: {
        name: "Ali Khan",
        phone: "03001234567",
        address: "House 42, Street 5, Johar Town",
        city: "Lahore",
      },
      items: [{ name: "20W Charger", quantity: 1 }],
      createdAt: new Date().toISOString(),
    };
    const res = validateOrderForAutopilot(mockOrder);
    assert(res.classification === "AUTO_READY", `Expected AUTO_READY, got ${res.classification}`);
    assert(res.exceptions.length === 0, "Should have 0 exceptions");
  });

  test("Validation: Duplicate Order within 15 mins -> VERIFY", () => {
    const now = new Date().toISOString();
    const order1: Order = {
      _id: "11",
      orderId: "VG-2002",
      total: 2500,
      customer: { phone: "03001234567", name: "Ali", address: "Johar Town", city: "Lahore" },
      createdAt: now,
    };
    const order2: Order = {
      _id: "12",
      orderId: "VG-2003",
      total: 2500,
      customer: { phone: "03001234567", name: "Ali", address: "Johar Town", city: "Lahore" },
      createdAt: now,
    };
    const res = validateOrderForAutopilot(order2, [order1]);
    assert(res.classification === "VERIFY", `Expected VERIFY, got ${res.classification}`);
    assert(res.isDuplicate === true, "Should flag as duplicate");
  });

  test("Validation: Invalid Phone -> BLOCKED", () => {
    const mockOrder: Order = {
      _id: "13",
      orderId: "VG-2004",
      total: 1000,
      customer: { phone: "invalid", address: "Street 1", city: "Lahore" },
      createdAt: new Date().toISOString(),
    };
    const res = validateOrderForAutopilot(mockOrder);
    assert(res.classification === "BLOCKED", `Expected BLOCKED, got ${res.classification}`);
  });

  console.log(`\n📊 Summary: ${passed}/${total} Autopilot tests PASSED.`);
  if (passed !== total) {
    process.exit(1);
  }
}
