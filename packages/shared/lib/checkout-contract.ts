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
    quantity?: number;
    variantKey?: string;
    price?: number;
  }[];
  customer?: CheckoutCustomer;
  payment?: { method?: string };
  giftWrap?: boolean;
  promoCode?: string;
  idempotencyKey?: string;
  consent?: string | null;
  // Backwards-compatible client fields. Server-side totals remain authoritative.
  subtotal?: number;
  shipping?: number;
  total?: number;
}
