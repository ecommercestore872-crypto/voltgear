import type { CheckoutBody, CheckoutCustomer } from "@/lib/checkout-contract";
import type {
  PriceMismatch,
  ResolvedOrderItem,
} from "@/lib/checkout-server";
import type { ClickAttributionInput } from "@/lib/db/order-attribution-rules";

type CheckoutFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface CheckoutRequestCartItem {
  slug: string;
  name: string;
  price: number;
  quantity: number;
  productId?: string;
  sku?: string;
  variantKey?: string;
  variantName?: string;
  variantSku?: string;
}

export interface BuildCheckoutOrderBodyInput {
  items: readonly CheckoutRequestCartItem[];
  customer: Record<string, string>;
  orderNotes: string;
  paymentMethod: "cod";
  subtotal: number;
  shipping: number;
  total: number;
  giftWrap: boolean;
  giftWrapFee: number;
  idempotencyKey: string;
  consent: string | null;
  promoCode?: string;
  attribution?: ClickAttributionInput;
}

export interface CheckoutOrderBody extends CheckoutBody {
  items: NonNullable<CheckoutBody["items"]>;
  customer: CheckoutCustomer;
  payment: { method: "cod" };
  giftWrapFee: number;
  idempotencyKey: string;
}

export interface CheckoutPromoRequest {
  code: string;
  subtotal: number;
  shipping: number;
  email?: string;
}

export type CheckoutPromoResponse =
  | {
      ok: true;
      code: string;
      type?: "percent" | "fixed" | "free_shipping";
      discount: number;
      shipping: number;
    }
  | {
      ok?: false;
      error?: string;
    };

export interface CheckoutOrderResponse {
  ok?: boolean;
  orderId?: string;
  lookupEmail?: string;
  subtotal?: number;
  shipping?: number;
  total?: number;
  discount?: number;
  promoCode?: string | null;
  lines?: ResolvedOrderItem[];
  items?: PriceMismatch[];
  code?: string;
  error?: string;
  replayed?: boolean;
}

function jsonRequest(body: unknown, headers?: HeadersInit): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(headers).entries()),
    },
    body: JSON.stringify(body),
  };
}

export function buildCheckoutOrderBody(
  input: BuildCheckoutOrderBodyInput,
): CheckoutOrderBody {
  const items = input.items.map((item) => ({
    slug: item.slug,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    ...(item.sku ? { sku: item.sku } : {}),
    ...(item.variantKey ? { variantKey: item.variantKey } : {}),
    ...(item.variantName ? { variantName: item.variantName } : {}),
    ...(item.variantSku ? { variantSku: item.variantSku } : {}),
  }));

  return {
    items,
    customer: {
      ...input.customer,
      note: input.orderNotes.trim() || undefined,
    },
    payment: { method: input.paymentMethod },
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    giftWrap: input.giftWrap,
    giftWrapFee: input.giftWrapFee,
    idempotencyKey: input.idempotencyKey,
    consent: input.consent,
    ...(input.promoCode ? { promoCode: input.promoCode } : {}),
    ...(input.attribution ? { attribution: input.attribution } : {}),
  };
}

export async function requestCheckoutPromo(
  body: CheckoutPromoRequest,
  fetcher: CheckoutFetch = fetch,
): Promise<{ response: Response; data: CheckoutPromoResponse }> {
  const response = await fetcher(
    "/api/promo/validate",
    jsonRequest(body),
  );
  const data = (await response.json()) as CheckoutPromoResponse;
  return { response, data };
}

export async function requestCheckoutOrder(
  body: CheckoutOrderBody,
  idempotencyKey: string,
  fetcher: CheckoutFetch = fetch,
): Promise<{ response: Response; data: CheckoutOrderResponse }> {
  const response = await fetcher(
    "/api/checkout",
    jsonRequest(body, { "Idempotency-Key": idempotencyKey }),
  );
  const data = (await response.json()) as CheckoutOrderResponse;
  return { response, data };
}
