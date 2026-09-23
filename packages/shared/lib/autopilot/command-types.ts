export type ExceptionSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ExceptionDomain =
  | "ORDER"
  | "FULFILLMENT"
  | "DELIVERY"
  | "FINANCE"
  | "INVENTORY"
  | "SUPPLIER"
  | "SYSTEM";

export interface OperationalException {
  id: string;
  dedupKey: string;
  domain: ExceptionDomain;
  severity: ExceptionSeverity;
  title: string;
  summary: string;
  amountAtRisk?: number;
  occurrenceCount: number;
  status: "OPEN" | "WAITING_CUSTOMER" | "WAITING_COURIER" | "RESOLVED" | "SNOOZED";
  recommendedAction: string;
  actionType:
    | "APPROVE_REORDER"
    | "FIX_ADDRESS"
    | "SUBMIT_CLAIM"
    | "MAP_CITY"
    | "RETRY_BOOKING"
    | "REVIEW_DISPUTE";
  entityId: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface OperationalSummaryStats {
  ordersAutoDispatched: number;
  shipmentsAutoRescued: number;
  codReconciledAmount: number;
  inventoryActionsCompleted: number;
  manualHoursSaved: number;
  automationRatePercentage: number;
}
