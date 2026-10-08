export type CheckoutFingerprintItem = {
  slug: string;
  quantity: number;
  variantKey?: string | null;
};

export function checkoutCartFingerprint(items: CheckoutFingerprintItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      slug: item.slug,
      q: item.quantity,
      v: item.variantKey ?? null,
    })),
  );
}

export function createCheckoutIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `co-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
