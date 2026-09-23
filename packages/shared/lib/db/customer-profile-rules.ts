import { normalizePhone } from "@/lib/messaging";

export function emailsMatchLoose(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return Boolean(x && y && x === y);
}

export function phonesMatchLoose(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na && nb) return na === nb;
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  return Boolean(da && db && da === db);
}

export function inboxMatchesCustomer(
  item: { email?: string; /* inbox has no phone today */ },
  customer: { email: string; phone: string }
): boolean {
  if (customer.email && item.email && emailsMatchLoose(customer.email, item.email)) {
    return true;
  }
  return false;
}

export function orderMatchesCustomerKey(
  order: {
    orderId: string;
    isDemo?: boolean;
    customer?: { email?: string; phone?: string };
  },
  key: string,
  customerEmail: string,
  customerPhone: string
): boolean {
  if (order.isDemo) return false;
  const email = (order.customer?.email ?? "").trim().toLowerCase();
  const phone = (order.customer?.phone ?? "").trim();
  const orderKey = email || phone || order.orderId;
  if (orderKey === key) return true;
  if (customerEmail && email && emailsMatchLoose(customerEmail, email)) return true;
  if (customerPhone && phone && phonesMatchLoose(customerPhone, phone)) return true;
  return false;
}
