export interface ProductAdMetrics {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  cogs: number; // Cost of Goods Sold
  estimatedShippingCost: number; // Delivered shipping cost
  rtoRatePercentage: number; // Return To Origin %
  currentStock: number;
  daysOfStockRemaining: number;
  adSpend: number;
  pixelRoas: number;
}

export interface AdAllocationRecommendation {
  productId: string;
  productName: string;
  sku: string;
  breakevenRoas: number;
  realDeliveredRoas: number;
  recommendedDailyBudget: number;
  tier: "HERO_WINNER" | "TESTING" | "HIGH_RTO_RISK" | "PAUSE_IMMINENT";
  actionSummary: string;
  guidanceReason: string;
}

export interface AdBudgetOverview {
  totalDailyBudget: number;
  winnerAllocatedBudget: number;
  testingAllocatedBudget: number;
  retargetingAllocatedBudget: number;
  recommendations: AdAllocationRecommendation[];
}
