/**
 * Canonical checkout intent used for server-side idempotency.
 *
 * Free-form order notes are included deliberately: a retry with a changed
 * delivery instruction must not replay an order containing the old instruction.
 * The checkout route already normalizes the note and folds the gift-wrap label
 * into it, while `giftWrap` remains explicit so the intent is self-documenting.
 */
export type CheckoutIntent = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    postal: string;
    note?: string;
  };
  items: Array<{
    slug: string;
    variantKey?: string;
    variantName?: string;
    variantSku?: string;
    quantity: number;
    price: number;
    lineTotal: number;
  }>;
  paymentMethod: string;
  giftWrap: boolean;
  promoCode?: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  isDemo?: boolean;
};

function text(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, canonical(nested)]),
    );
  }
  return value;
}

export function checkoutIntentPayload(input: CheckoutIntent): Record<string, unknown> {
  const items = input.items
    .map((item) => ({
      slug: text(item.slug).toLowerCase(),
      variantKey: text(item.variantKey).toLowerCase() || undefined,
      variantName: text(item.variantName) || undefined,
      variantSku: text(item.variantSku).toLowerCase() || undefined,
      quantity: Number(item.quantity),
      price: money(item.price),
      lineTotal: money(item.lineTotal),
    }))
    .sort((a, b) =>
      `${a.slug}|${a.variantKey ?? ""}`.localeCompare(`${b.slug}|${b.variantKey ?? ""}`),
    );

  return canonical({
    customer: {
      name: text(input.customer.name),
      email: text(input.customer.email).toLowerCase(),
      phone: text(input.customer.phone),
      address: text(input.customer.address),
      city: text(input.customer.city),
      postal: text(input.customer.postal),
      note: text(input.customer.note) || undefined,
    },
    items,
    paymentMethod: text(input.paymentMethod).toLowerCase(),
    giftWrap: input.giftWrap === true,
    promoCode: text(input.promoCode).toUpperCase() || null,
    subtotal: money(input.subtotal),
    shipping: money(input.shipping),
    discount: money(input.discount),
    total: money(input.total),
    isDemo: input.isDemo === true,
  }) as Record<string, unknown>;
}

export function stableCheckoutIntentString(input: CheckoutIntent): string {
  return JSON.stringify(checkoutIntentPayload(input));
}
