import { normalizePhoneForCheckout } from "@/lib/checkout-customer-rules";

export function validateTrackOrderId(raw: string): string | null {
  const id = raw.trim();
  if (!id) return "Enter your order number.";
  if (id.length < 4) return "Check the order number on your confirmation.";
  return null;
}

export function validateTrackOrderPhone(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Enter the mobile number from checkout.";
  if (!normalizePhoneForCheckout(v)) {
    return "Use the same format as checkout (e.g. 03XX XXXXXXX).";
  }
  return null;
}

export function validateTrackOrderForm(orderId: string, phone: string) {
  const errors: { orderId?: string; phone?: string } = {};
  const orderMsg = validateTrackOrderId(orderId);
  const phoneMsg = validateTrackOrderPhone(phone);
  if (orderMsg) errors.orderId = orderMsg;
  if (phoneMsg) errors.phone = phoneMsg;
  return errors;
}
