export type AutopilotConfig = {
  autoDispatch: boolean;
  autoRescue: boolean;
};

export function parseAutopilotConfig(raw: unknown): AutopilotConfig {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    autoDispatch: rec.autoDispatch === true,
    autoRescue: rec.autoRescue === true,
  };
}

export const DISPATCH_BATCH_LIMIT = 8;
export const RESCUE_BATCH_LIMIT = 20;
