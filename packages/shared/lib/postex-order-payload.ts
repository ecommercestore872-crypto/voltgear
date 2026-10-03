import { normalizePhoneForCheckout } from "@/lib/checkout-customer-rules";
import { normalizePhone } from "@/lib/messaging";
import type { PostExBaseEnv, PostExOrderPayload } from "@/lib/postex";
import type { Order, OrderItem } from "@/lib/types";

/** Shape required by PostEx Create Order API (dry-run / future booking). */
export type PostExCreateOrderPayload = {
  cityName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  invoiceDivision: number;
  invoicePayment: number;
  items: number;
  orderDetail: string;
  orderRefNumber: string;
  orderType: "Normal";
  transactionNotes: string;
  pickupAddressCode: string;
};

export type BuildPostExOrderPayloadResult =
  | { ok: true; payload: PostExCreateOrderPayload }
  | { ok: false; missingOrInvalid: string[] };

/** Pakistani mobile in 03XXXXXXXXX form for PostEx. */
export function normalizePhoneForPostEx(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const e164 = normalizePhone(trimmed) ?? normalizePhoneForCheckout(trimmed);
  if (e164?.startsWith("+92") && e164.length === 13) {
    return `0${e164.slice(3)}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("03")) return digits;
  if (digits.length === 10 && digits.startsWith("3")) return `0${digits}`;

  return null;
}

export function sumPostExItemCount(items: OrderItem[] | undefined): number {
  if (!items?.length) return 0;
  return items.reduce((sum, line) => {
    const q = line.quantity;
    if (q != null && Number.isFinite(q) && q > 0) return sum + Math.floor(q);
    return sum + 1;
  }, 0);
}

export function buildPostExOrderDetail(items: OrderItem[] | undefined): string {
  if (!items?.length) return "";
  return items
    .map((i) => {
      const name = (i.name ?? "Item").trim() || "Item";
      const q =
        i.quantity != null && Number.isFinite(i.quantity) && i.quantity > 0
          ? Math.floor(i.quantity)
          : 1;
      return `${name} x${q}`;
    })
    .join("; ");
}

function readPickupAddressCode(
  env: PostExBaseEnv = process.env as PostExBaseEnv,
): string | null {
  const code = env.POSTEX_PICKUP_ADDRESS_CODE?.trim();
  return code || null;
}

const POSTEX_CITY_NOT_OPERATIONAL = "customer.city (not a PostEx operational city)";

/**
 * Match order city to PostEx operational city list (case-insensitive, trimmed).
 * Returns the canonical name from PostEx when matched.
 */
export function resolvePostExOperationalCityName(
  raw: string | undefined | null,
  operationalCities: string[],
): { ok: true; cityName: string } | { ok: false } {
  const needle = raw?.trim();
  if (!needle || !operationalCities.length) return { ok: false };

  const match = operationalCities.find(
    (city) => city.trim().toLowerCase() === needle.toLowerCase(),
  );
  if (!match) return { ok: false };

  return { ok: true, cityName: match.trim() };
}

/**
 * Maps a Buy N Try order to a PostEx create-order payload. Does not call PostEx or mutate data.
 */
export function buildPostExOrderPayloadFromOrder(
  order: Order,
  operationalCities: string[],
  env: PostExBaseEnv = process.env as PostExBaseEnv,
): BuildPostExOrderPayloadResult {
  const missingOrInvalid: string[] = [];
  const customer = order.customer ?? {};

  const orderRefNumber = order.orderId?.trim();
  if (!orderRefNumber) missingOrInvalid.push("order.orderId");

  const customerName = customer.name?.trim();
  if (!customerName) missingOrInvalid.push("customer.name");

  const customerPhone = normalizePhoneForPostEx(customer.phone);
  if (!customerPhone) missingOrInvalid.push("customer.phone");

  let cityName: string | null = null;
  if (!customer.city?.trim()) {
    missingOrInvalid.push("customer.city");
  } else if (!operationalCities.length) {
    missingOrInvalid.push("PostEx operational cities (unavailable)");
  } else {
    const resolvedCity = resolvePostExOperationalCityName(
      customer.city,
      operationalCities,
    );
    if (!resolvedCity.ok) {
      missingOrInvalid.push(POSTEX_CITY_NOT_OPERATIONAL);
    } else {
      cityName = resolvedCity.cityName;
    }
  }

  const deliveryAddress = customer.address?.trim();
  if (!deliveryAddress || deliveryAddress.length < 5) {
    missingOrInvalid.push("customer.address");
  }

  const pickupAddressCode = readPickupAddressCode(env);
  if (!pickupAddressCode) missingOrInvalid.push("POSTEX_PICKUP_ADDRESS_CODE");

  const itemCount = sumPostExItemCount(order.items);
  if (itemCount <= 0) missingOrInvalid.push("order.items");

  const total = order.total;
  if (total == null || !Number.isFinite(total) || total < 0) {
    missingOrInvalid.push("order.total");
  }

  const orderDetail = buildPostExOrderDetail(order.items);
  if (!orderDetail) missingOrInvalid.push("orderDetail");

  if (missingOrInvalid.length) {
    return { ok: false, missingOrInvalid };
  }

  const transactionNotes = customer.note?.trim() ?? "";

  return {
    ok: true,
    payload: {
      cityName: cityName as string,
      customerName: customerName!,
      customerPhone: customerPhone!,
      deliveryAddress: deliveryAddress!,
      invoiceDivision: 1,
      invoicePayment: Math.round(total!),
      items: itemCount,
      orderDetail,
      orderRefNumber: orderRefNumber!,
      orderType: "Normal",
      transactionNotes,
      pickupAddressCode: pickupAddressCode!,
    },
  };
}

/** Human-readable booking validation message (same rules as dry-run payload). */
export function formatPostExOrderPayloadBuildError(missingOrInvalid: string[]): string {
  return `Order is not ready for PostEx booking: ${missingOrInvalid.join("; ")}.`;
}

/** Maps canonical dry-run payload to create-order API input (single source of truth). */
export function toPostExOrderPayloadForApi(
  payload: PostExCreateOrderPayload,
): PostExOrderPayload {
  return {
    orderRefNumber: payload.orderRefNumber,
    invoicePayment: payload.invoicePayment,
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    deliveryAddress: payload.deliveryAddress,
    cityName: payload.cityName,
    pickupAddressCode: payload.pickupAddressCode,
    orderDetail: payload.orderDetail,
    invoiceDivision: payload.invoiceDivision,
    items: payload.items,
    transactionNotes: payload.transactionNotes || undefined,
  };
}
