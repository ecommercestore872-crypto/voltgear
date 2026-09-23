import { shouldExecuteAutomation, updateAutopilotSettings, getAutopilotSettings } from "./telemetry-guard";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ TEST FAILED: ${msg}`);
}

export function runTelemetryGuardTests() {
  console.log("🧪 Running Autopilot Settings & Telemetry Guard Test Suite...\n");
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

  // 1. ACTIVE Mode Test
  test("Guard: ACTIVE mode enables execution and telemetry", () => {
    updateAutopilotSettings({ masterEnabled: true });
    const res = shouldExecuteAutomation("ACTIVE");
    assert(res.canExecute === true, "Should execute in ACTIVE mode");
    assert(res.canGatherTelemetry === true, "Should gather telemetry in ACTIVE mode");
  });

  // 2. SHADOW / TELEMETRY Mode Test
  test("Guard: SHADOW_TELEMETRY mode disables execution but enables telemetry", () => {
    updateAutopilotSettings({ masterEnabled: true });
    const res = shouldExecuteAutomation("SHADOW_TELEMETRY");
    assert(res.canExecute === false, "Should NOT execute external action in SHADOW mode");
    assert(res.canGatherTelemetry === true, "Should STILL gather background telemetry in SHADOW mode");
  });

  // 3. Master OFFLINE Test
  test("Guard: Master OFF allows passive background telemetry if configured", () => {
    updateAutopilotSettings({ masterEnabled: false, telemetryGatheringEnabled: true });
    const res = shouldExecuteAutomation("ACTIVE");
    assert(res.canExecute === false, "Should NOT execute when master is OFF");
    assert(res.canGatherTelemetry === true, "Should STILL gather telemetry if telemetryGatheringEnabled is true");
  });

  console.log(`\n📊 Summary: ${passed}/${total} Settings & Telemetry Guard tests PASSED.`);
  if (passed !== total) process.exit(1);
}
