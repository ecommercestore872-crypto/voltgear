import {
  allocatePublicOrderId,
  createOrderRow,
  enqueueEmailEventRow,
  getAllOrders as getAllOrdersFromDb,
  getOrderByPublicId,
  getOrdersByEmail as getOrdersByEmailFromDb,
  getPendingEmailEvents as getPendingEmailEventsFromDb,
  markEmailSent as markEmailSentRow,
  recentWinbackExists as recentWinbackExistsRow,
  appendOrderHistoryNote,
  cancelOrderRestoreInventoryRow,
  updateOrderStatusRow,
  deleteOrderRow,
} from "@/lib/db/store";
import { ORDER_STATUS_VALUES } from "@/lib/db/order-rules";
import type {
  EmailEventKind,
  Order,
  OrderCustomer,
  OrderItem,
  OrderStatus,
} from "@/lib/types";

export interface NewOrderInput {
  orderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  payment: string;
  subtotal: number;
  shipping: number;
  total: number;
  discount?: number;
  promoCode?: string | null;
  isDemo?: boolean;
}

export async function createOrder(order: NewOrderInput): Promise<string | null> {
  return createOrderRow(order);
}

export async function nextPublicOrderId(): Promise<string> {
  return allocatePublicOrderId();
}

export async function getOrdersByEmail(email: string): Promise<Order[]> {
  return getOrdersByEmailFromDb(email);
}

export async function getAllOrders(): Promise<Order[]> {
  return getAllOrdersFromDb();
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  return getOrderByPublicId(orderId);
}

export const ORDER_STATUSES = ORDER_STATUS_VALUES;

export async function appendOrderNote(orderId: string, note: string): Promise<void> {
  return appendOrderHistoryNote(orderId, note);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<Order | null> {
  return updateOrderStatusRow(orderId, status, note);
}

export async function cancelOrder(
  orderId: string,
  note: string = "Cancelled by user"
): Promise<{ ok: boolean; error?: string }> {
  return cancelOrderRestoreInventoryRow(orderId, note);
}

export async function deleteOrder(orderId: string): Promise<boolean> {
  return deleteOrderRow(orderId);
}

export async function enqueueEmailEvent(
  kind: EmailEventKind,
  email: string,
  data: unknown,
  delayMs: number
): Promise<void> {
  return enqueueEmailEventRow(kind, email, data, delayMs);
}

export async function getPendingEmailEvents() {
  return getPendingEmailEventsFromDb();
}

export async function markEmailSent(
  eventId: string,
  sentAt = new Date().toISOString()
): Promise<void> {
  return markEmailSentRow(eventId, sentAt);
}

export async function recentWinbackExists(
  email: string,
  sinceIso: string
): Promise<boolean> {
  return recentWinbackExistsRow(email, sinceIso);
}
