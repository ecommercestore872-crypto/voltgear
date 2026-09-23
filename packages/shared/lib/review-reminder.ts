export const VG_LAST_ORDER_KEY = "vg_last_order";
export const VG_REMINDER_DISMISSED_KEY = "vg_reminder_dismissed";
export const VG_REMINDER_DAYS = 1; // show the reminder within 24h of purchase

export interface LastOrder {
  at: number;
  orderId: string;
  email: string;
  name: string;
  product: { slug: string; name: string; image?: string };
}

export function saveLastOrder(order: LastOrder) {
  try {
    localStorage.setItem(VG_LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // ignore private-mode failures
  }
}

export function clearLastOrder() {
  try {
    localStorage.removeItem(VG_LAST_ORDER_KEY);
  } catch {
    // ignore
  }
}

export function getLastOrder(): LastOrder | null {
  try {
    const raw = localStorage.getItem(VG_LAST_ORDER_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as LastOrder;
    if (!order || typeof order.at !== "number" || !order.product) return null;
    const fresh =
      Date.now() - order.at < VG_REMINDER_DAYS * 24 * 60 * 60 * 1000;
    return fresh ? order : null;
  } catch {
    return null;
  }
}

export function isReminderDismissed(): boolean {
  try {
    const raw = localStorage.getItem(VG_REMINDER_DISMISSED_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < VG_REMINDER_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function dismissReminder() {
  try {
    localStorage.setItem(VG_REMINDER_DISMISSED_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}
