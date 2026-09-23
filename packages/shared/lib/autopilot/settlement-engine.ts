import {
  CourierSettlementBatch,
  SettlementDiscrepancyType,
  SettlementItem,
} from "./settlement-types";

export interface RawCourierPayoutRecord {
  trackingNumber: string;
  orderId?: string;
  collectedCod: number;
  chargedShippingFee: number;
  rtoFee?: number;
}

export interface ExpectedOrderRecord {
  orderId: string;
  trackingNumber: string;
  expectedCod: number;
  expectedShippingFee: number;
}

/**
 * Reconciles a raw courier payout statement against expected VoltGear order records.
 */
export function reconcileCourierSettlement(
  batchReference: string,
  provider: "POSTEX" | "LEOPARDS" | "TCS",
  payoutDate: string,
  rawRecords: RawCourierPayoutRecord[],
  expectedOrders: Map<string, ExpectedOrderRecord>
): CourierSettlementBatch {
  let totalCodCollected = 0;
  let totalFeesDeducted = 0;
  let hasDiscrepancies = false;

  const items: SettlementItem[] = rawRecords.map((rec, idx) => {
    const expected = expectedOrders.get(rec.trackingNumber) || expectedOrders.get(rec.orderId || "");

    const collectedCod = rec.collectedCod || 0;
    const chargedFee = rec.chargedShippingFee || 0;
    const rtoFee = rec.rtoFee || 0;
    const netPayout = collectedCod - (chargedFee + rtoFee);

    totalCodCollected += collectedCod;
    totalFeesDeducted += chargedFee + rtoFee;

    if (!expected) {
      hasDiscrepancies = true;
      return {
        id: `set_item_${idx}_${Date.now()}`,
        trackingNumber: rec.trackingNumber,
        orderId: rec.orderId || "UNKNOWN",
        expectedCod: 0,
        collectedCod,
        expectedShippingFee: 0,
        chargedShippingFee: chargedFee,
        rtoFee,
        netPayout,
        discrepancyType: "UNSETTLED_DELIVERY",
        discrepancyAmount: netPayout,
        status: "UNMATCHED",
      };
    }

    let discrepancyType: SettlementDiscrepancyType | undefined;
    let discrepancyAmount = 0;

    // Check 1: COD Underpaid
    if (collectedCod < expected.expectedCod) {
      discrepancyType = "COD_UNDERPAID";
      discrepancyAmount = expected.expectedCod - collectedCod;
    }
    // Check 2: Fee Overcharged
    else if (chargedFee > expected.expectedShippingFee) {
      discrepancyType = "OVERCHARGED_FEE";
      discrepancyAmount = chargedFee - expected.expectedShippingFee;
    }

    if (discrepancyType) {
      hasDiscrepancies = true;
    }

    return {
      id: `set_item_${idx}_${Date.now()}`,
      trackingNumber: rec.trackingNumber,
      orderId: expected.orderId,
      expectedCod: expected.expectedCod,
      collectedCod,
      expectedShippingFee: expected.expectedShippingFee,
      chargedShippingFee: chargedFee,
      rtoFee,
      netPayout,
      discrepancyType,
      discrepancyAmount,
      status: discrepancyType ? "DISCREPANCY" : "RECONCILED",
    };
  });

  return {
    id: `batch_${batchReference}_${Date.now()}`,
    batchReference,
    provider,
    payoutDate,
    totalParcels: items.length,
    totalCodCollected,
    totalFeesDeducted,
    netAmountPaid: totalCodCollected - totalFeesDeducted,
    status: hasDiscrepancies ? "HAS_DISCREPANCIES" : "BALANCED",
    items,
    createdAt: new Date().toISOString(),
  };
}
