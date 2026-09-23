export type SettlementDiscrepancyType =
  | "COD_UNDERPAID"
  | "OVERCHARGED_FEE"
  | "UNEXPLAINED_RTO_FEE"
  | "UNSETTLED_DELIVERY"
  | "DUPLICATE_DEDUCTION";

export interface SettlementItem {
  id: string;
  trackingNumber: string;
  orderId: string;
  expectedCod: number;
  collectedCod: number;
  expectedShippingFee: number;
  chargedShippingFee: number;
  rtoFee: number;
  netPayout: number;
  discrepancyType?: SettlementDiscrepancyType;
  discrepancyAmount?: number;
  status: "RECONCILED" | "DISCREPANCY" | "UNMATCHED";
}

export interface CourierSettlementBatch {
  id: string;
  batchReference: string; // Courier payout ID
  provider: "POSTEX" | "LEOPARDS" | "TCS";
  payoutDate: string;
  totalParcels: number;
  totalCodCollected: number;
  totalFeesDeducted: number;
  netAmountPaid: number;
  status: "BALANCED" | "HAS_DISCREPANCIES";
  items: SettlementItem[];
  createdAt: string;
}
