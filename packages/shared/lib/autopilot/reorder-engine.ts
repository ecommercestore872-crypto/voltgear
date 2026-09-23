import { ReorderRecommendation, SkuInventory } from "./inventory-types";

/**
 * Calculates the Reorder Point (ROP) for a SKU based on demand and lead time.
 * ROP = (Average Daily Sales * Supplier Lead Time) + Safety Stock
 */
export function calculateReorderPoint(
  avgDailySales: number,
  supplierLeadTimeDays: number,
  safetyStock: number
): number {
  return Math.ceil(avgDailySales * supplierLeadTimeDays + safetyStock);
}

/**
 * Evaluates SKU inventory against forecasting rules to generate reorder recommendations.
 */
export function evaluateSkuReorder(
  inv: SkuInventory,
  productName: string,
  avgDailySales: number,
  supplierLeadTimeDays: number,
  targetCoverageDays: number = 45
): ReorderRecommendation {
  const reorderPoint = calculateReorderPoint(avgDailySales, inv.safetyStock, inv.safetyStock);
  const effectivePosition = inv.available + inv.incoming - inv.committed;
  const daysOfStockRemaining = avgDailySales > 0 ? Math.floor(inv.available / avgDailySales) : 999;

  let status: ReorderRecommendation["status"] = "HEALTHY";
  let suggestedReorderQuantity = 0;

  if (effectivePosition <= reorderPoint) {
    status = daysOfStockRemaining <= supplierLeadTimeDays ? "STOCKOUT_RISK" : "REORDER_NEEDED";
    const targetDemand = Math.ceil(avgDailySales * targetCoverageDays);
    suggestedReorderQuantity = Math.max(0, targetDemand - effectivePosition);
  }

  return {
    sku: inv.sku,
    productName,
    available: inv.available,
    incoming: inv.incoming,
    committed: inv.committed,
    effectivePosition,
    avgDailySales,
    supplierLeadTimeDays,
    reorderPoint,
    suggestedReorderQuantity,
    daysOfStockRemaining,
    status,
  };
}
