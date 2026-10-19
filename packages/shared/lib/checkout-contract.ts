import type { ClickAttributionInput } from "@/lib/db/order-attribution-rules";

export interface CheckoutCustomer {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal?: string;
  note?: string;
}

export interface CheckoutBody {
  items?: {
    slug?: string;
    name?: string;
    quantity?: number;
    variantKey?: string;
    variantName?: string;
    variantSku?: string;
    sku?: string;
    price?: number;
  }[];
  customer?: CheckoutCustomer;
  payment?: { method?: string };
  giftWrap?: boolean;
  giftWrapFee?: number;
  promoCode?: string;
  idempotencyKey?: string;
  consent?: string | null;
  attribution?: ClickAttributionInput;
  // Backwards-compatible client fields. Server-side totals remain authoritative.
  subtotal?: number;
  shipping?: number;
  total?: number;
}
