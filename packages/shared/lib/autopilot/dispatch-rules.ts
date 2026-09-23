import type { Order } from "@/lib/types";

import { validateOrderForAutopilot } from "./validator";

export type DispatchDecision = {
  action: "book" | "skip" | "hold";
  reason: string;
};

export function classifyDispatch(order: Order, recent: Order[] = []): DispatchDecision {
  if (order.isDemo) return { action: "skip", reason: "Practice order" };
  if ((order.postexTrackingNumber ?? "").trim()) {
    return { action: "skip", reason: "Already has a PostEx tracking number" };
  }
  const status = order.status ?? "new";
  if (status !== "new" && status !== "processing") {
    return { action: "skip", reason: `Status is ${status}` };
  }
  const v = validateOrderForAutopilot(order, recent);
  if (v.classification === "AUTO_READY") {
    return { action: "book", reason: "Ready for PostEx" };
  }
  return {
    action: "hold",
    reason: v.exceptions[0]?.reason || v.classification,
  };
}
