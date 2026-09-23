import { InventoryMovement, SkuInventory } from "./inventory-types";

/**
 * Atomically reserves stock for a new order by moving AVAILABLE stock to COMMITTED.
 */
export function allocateStockForOrder(
  inv: SkuInventory,
  quantity: number,
  orderId: string
): { updatedInv: SkuInventory; movement: InventoryMovement } {
  if (inv.available < quantity) {
    throw new Error(`Insufficient available stock for SKU ${inv.sku}. Requested: ${quantity}, Available: ${inv.available}`);
  }

  const updatedInv: SkuInventory = {
    ...inv,
    available: inv.available - quantity,
    committed: inv.committed + quantity,
  };

  const movement: InventoryMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sku: inv.sku,
    movementType: "ORDER_COMMITTED",
    quantityChange: -quantity,
    previousAvailable: inv.available,
    newAvailable: updatedInv.available,
    referenceId: orderId,
    timestamp: new Date().toISOString(),
  };

  return { updatedInv, movement };
}

/**
 * Releases COMMITTED stock back to AVAILABLE upon order cancellation.
 */
export function releaseStockForOrder(
  inv: SkuInventory,
  quantity: number,
  orderId: string
): { updatedInv: SkuInventory; movement: InventoryMovement } {
  const releaseQty = Math.min(inv.committed, quantity);

  const updatedInv: SkuInventory = {
    ...inv,
    available: inv.available + releaseQty,
    committed: inv.committed - releaseQty,
  };

  const movement: InventoryMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sku: inv.sku,
    movementType: "ORDER_CANCEL_RELEASED",
    quantityChange: releaseQty,
    previousAvailable: inv.available,
    newAvailable: updatedInv.available,
    referenceId: orderId,
    timestamp: new Date().toISOString(),
  };

  return { updatedInv, movement };
}

/**
 * Consumes COMMITTED and ON_HAND stock when an order is dispatched to courier.
 */
export function consumeStockOnDispatch(
  inv: SkuInventory,
  quantity: number,
  orderId: string
): { updatedInv: SkuInventory; movement: InventoryMovement } {
  const consumeQty = Math.min(inv.committed, quantity);

  const updatedInv: SkuInventory = {
    ...inv,
    onHand: inv.onHand - consumeQty,
    committed: inv.committed - consumeQty,
  };

  const movement: InventoryMovement = {
    id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sku: inv.sku,
    movementType: "DISPATCHED_CONSUMED",
    quantityChange: 0, // Available stock was already reduced during commit
    previousAvailable: inv.available,
    newAvailable: inv.available,
    referenceId: orderId,
    timestamp: new Date().toISOString(),
  };

  return { updatedInv, movement };
}
