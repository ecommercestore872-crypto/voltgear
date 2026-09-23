import { AdAllocationRecommendation, AdBudgetOverview, ProductAdMetrics } from "./ad-types";

/**
 * Calculates Breakeven ROAS based on Price, COGS, Shipping, and RTO buffer.
 * Breakeven ROAS = Price / Net Profit Margin per unit.
 */
export function calculateBreakevenRoas(
  price: number,
  cogs: number,
  shipping: number = 250,
  rtoRatePercentage: number = 10
): number {
  const rtoBuffer = price * (rtoRatePercentage / 100);
  const netMargin = price - cogs - shipping - rtoBuffer;

  if (netMargin <= 0) return 99; // Non-profitable product
  return parseFloat((price / netMargin).toFixed(2));
}

/**
 * Evaluates product ad metrics to generate lightweight budget allocation advice.
 */
export function evaluateProductAdAllocation(
  product: ProductAdMetrics,
  totalDailyBudget: number
): AdAllocationRecommendation {
  const breakevenRoas = calculateBreakevenRoas(
    product.price,
    product.cogs,
    product.estimatedShippingCost,
    product.rtoRatePercentage
  );

  // Delivered ROAS accounts for RTO loss
  const realDeliveredRoas = parseFloat(
    (product.pixelRoas * (1 - product.rtoRatePercentage / 100)).toFixed(2)
  );

  let tier: AdAllocationRecommendation["tier"] = "TESTING";
  let recommendedDailyBudget = Math.round(totalDailyBudget * 0.2); // Default testing share
  let actionSummary = "Allocate micro-testing budget (Rs 1,000–1,500/day)";
  let guidanceReason = "Product has potential. Test creative angles before scaling.";

  if (product.daysOfStockRemaining <= 3) {
    tier = "PAUSE_IMMINENT";
    recommendedDailyBudget = 0;
    actionSummary = "Pause or reduce ad budget immediately";
    guidanceReason = `Stockout risk! Only ${product.daysOfStockRemaining} days of stock left. Do not waste ad money.`;
  } else if (product.rtoRatePercentage > 20) {
    tier = "HIGH_RTO_RISK";
    recommendedDailyBudget = Math.round(totalDailyBudget * 0.1);
    actionSummary = "Cap budget & enable COD phone verification";
    guidanceReason = `High return rate (${product.rtoRatePercentage}%). Verify customer phone numbers before scaling.`;
  } else if (realDeliveredRoas >= breakevenRoas * 1.25) {
    tier = "HERO_WINNER";
    recommendedDailyBudget = Math.round(totalDailyBudget * 0.6);
    actionSummary = "SCALE UP: Increase daily budget by +20%";
    guidanceReason = `Delivered ROAS (${realDeliveredRoas}x) exceeds breakeven (${breakevenRoas}x). High profit winner!`;
  }

  return {
    productId: product.productId,
    productName: product.productName,
    sku: product.sku,
    breakevenRoas,
    realDeliveredRoas,
    recommendedDailyBudget,
    tier,
    actionSummary,
    guidanceReason,
  };
}

/**
 * Calculates complete Ad Budget Breakdown across Hero Winners, Testing, and Retargeting.
 */
export function buildAdBudgetOverview(
  products: ProductAdMetrics[],
  totalDailyBudget: number
): AdBudgetOverview {
  const recommendations = products.map((p) => evaluateProductAdAllocation(p, totalDailyBudget));

  const winnerAllocatedBudget = recommendations
    .filter((r) => r.tier === "HERO_WINNER")
    .reduce((sum, r) => sum + r.recommendedDailyBudget, 0);

  const testingAllocatedBudget = recommendations
    .filter((r) => r.tier === "TESTING")
    .reduce((sum, r) => sum + r.recommendedDailyBudget, 0);

  const retargetingAllocatedBudget = Math.max(
    0,
    totalDailyBudget - winnerAllocatedBudget - testingAllocatedBudget
  );

  return {
    totalDailyBudget,
    winnerAllocatedBudget,
    testingAllocatedBudget,
    retargetingAllocatedBudget,
    recommendations,
  };
}
