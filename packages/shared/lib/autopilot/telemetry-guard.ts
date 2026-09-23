import { AutopilotControlSettings, AutopilotMode, DEFAULT_AUTOPILOT_SETTINGS } from "./settings";

let currentSettings: AutopilotControlSettings = { ...DEFAULT_AUTOPILOT_SETTINGS };

export function getAutopilotSettings(): AutopilotControlSettings {
  return currentSettings;
}

export function updateAutopilotSettings(newSettings: Partial<AutopilotControlSettings>): AutopilotControlSettings {
  currentSettings = {
    ...currentSettings,
    ...newSettings,
    updatedAt: new Date().toISOString(),
  };
  return currentSettings;
}

export function shouldExecuteAutomation(mode: AutopilotMode): { canExecute: boolean; canGatherTelemetry: boolean } {
  if (!currentSettings.masterEnabled || mode === "DISABLED") {
    return { canExecute: false, canGatherTelemetry: currentSettings.telemetryGatheringEnabled };
  }

  if (mode === "SHADOW_TELEMETRY") {
    return { canExecute: false, canGatherTelemetry: true };
  }

  return { canExecute: true, canGatherTelemetry: true };
}
