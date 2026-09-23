export interface SkuInventory {
  sku: string;
  productId: string;
  variantId: string;
  onHand: number; // Physical total in warehouse
  available: number; // Available for web sales
  committed: number; // Reserved for open orders
  safetyStock: number; // Protected buffer
  damaged: number; // Unsallable damaged units
  incoming: number; // Inbound on Purchase Orders
}

export type InventoryMovementType =
  | "ORDER_COMMITTED"
  | "ORDER_CANCEL_RELEASED"
  | "DISPATCHED_CONSUMED"
  | "PURCHASE_RECEIVED"
  | "DAMAGE_ADJUSTMENT"
  | "STOCK_COUNT_CORRECTION";

export interface InventoryMovement {
  id: string;
  sku: string;
  movementType: InventoryMovementType;
  quantityChange: number;
  previousAvailable: number;
  newAvailable: number;
  referenceId?: string; // Order ID or PO ID
  timestamp: string;
}

export interface ReorderRecommendation {
  sku: string;
  productName: string;
  available: number;
  incoming: number;
  committed: number;
  effectivePosition: number;
  avgDailySales: number;
  supplierLeadTimeDays: number;
  reorderPoint: number;
  suggestedReorderQuantity: number;
  daysOfStockRemaining: number;
  status: "HEALTHY" | "REORDER_NEEDED" | "STOCKOUT_RISK";
}
