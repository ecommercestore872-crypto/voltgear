import { parseSettlementCsv } from "@/lib/autopilot/settlement-csv";
import { reconcileCourierSettlement, type ExpectedOrderRecord } from "@/lib/autopilot/settlement-engine";
import type { Order } from "@/lib/types";

export function expectedFromOrders(orders: Order[]): Map<string, ExpectedOrderRecord> {
  const map = new Map<string, ExpectedOrderRecord>();
  for (const o of orders) {
    const tn = (o.postexTrackingNumber ?? "").trim();
    if (!tn || o.isDemo) continue;
    map.set(tn, {
      orderId: o.orderId,
      trackingNumber: tn,
      expectedCod: o.total ?? 0,
      expectedShippingFee: o.shipping ?? 0,
    });
  }
  return map;
}

export function settleFromCsv(csv: string, orders: Order[]) {
  const raw = parseSettlementCsv(csv);
  return reconcileCourierSettlement(
    `csv-${new Date().toISOString().slice(0, 10)}`,
    "POSTEX",
    new Date().toISOString().slice(0, 10),
    raw,
    expectedFromOrders(orders)
  );
}
