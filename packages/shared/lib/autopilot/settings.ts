export type AutopilotMode = "ACTIVE" | "SHADOW_TELEMETRY" | "DISABLED";

export interface AutopilotControlSettings {
  masterEnabled: boolean;
  orderDispatchMode: AutopilotMode; // Automation #1
  deliveryRescueMode: AutopilotMode; // Automation #2
  settlementReconciliationMode: AutopilotMode; // Automation #3
  inventoryReorderMode: AutopilotMode; // Automation #4
  commandCenterMode: AutopilotMode; // Automation #5
  telemetryGatheringEnabled: boolean;
  updatedAt: string;
}

export const DEFAULT_AUTOPILOT_SETTINGS: AutopilotControlSettings = {
  masterEnabled: false,
  orderDispatchMode: "DISABLED",
  deliveryRescueMode: "DISABLED",
  settlementReconciliationMode: "DISABLED",
  inventoryReorderMode: "DISABLED",
  commandCenterMode: "DISABLED",
  telemetryGatheringEnabled: false,
  updatedAt: new Date().toISOString(),
};
