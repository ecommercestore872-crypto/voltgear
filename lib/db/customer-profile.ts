import { listContactSubmissions, type InboxItem } from "@/lib/db/inbox-store";
import {
  buildCustomerRowsFromOrders,
  type CustomerRow,
} from "@/lib/db/customer-list";
import { inboxMatchesCustomer } from "@/lib/db/customer-profile-rules";
import {
  getOrderById,
  getOrdersByEmail,
  getOrdersByPhone,
} from "@/lib/order-store";
import type { Order } from "@/lib/types";

export type CustomerProfile = {
  customer: CustomerRow;
  orders: Order[];
  inbox: InboxItem[];
};

export async function getCustomerProfile(
  key: string,
): Promise<CustomerProfile | null> {
  const decoded = decodeURIComponent(key).trim();
  let matchedOrders: Order[] = [];

  if (decoded.includes("@")) {
    matchedOrders = await getOrdersByEmail(decoded.toLowerCase());
  } else {
    matchedOrders = await getOrdersByPhone(decoded);
  }

  if (matchedOrders.length === 0) {
    const single = await getOrderById(decoded);
    if (single && !single.isDemo) matchedOrders = [single];
  }

  if (matchedOrders.length === 0) return null;

  const rows = buildCustomerRowsFromOrders(matchedOrders);
  const customer =
    rows.find((r) => r.key === decoded) ??
    rows.find(
      (r) =>
        (decoded.includes("@") &&
          r.email.toLowerCase() === decoded.toLowerCase()) ||
        (r.phone && r.phone === decoded),
    ) ??
    rows[0];

  const inboxAll = await listContactSubmissions({ includeDemo: false }).catch(
    () => [] as InboxItem[],
  );
  const inbox = inboxAll.filter((item) =>
    inboxMatchesCustomer(item, {
      email: customer.email,
      phone: customer.phone,
    }),
  );

  return { customer, orders: matchedOrders, inbox };
}
