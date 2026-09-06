export const SHOPPER_BRAND = {
  spokenName: "Buy n Try",
  seal: "BNT",
  sealSrc: "/brand/bnt-seal.png",
  tagline: "Buy it. Try it.",
  preferredWelcomeCode: "BNT10",
  fallbackStoreName: "Buy n Try",
  publicOrigin: "https://buyntryy.com",
} as const;

const PLACEHOLDER_BRAND_NAMES = new Set([
  "accessories hub",
  "voltgear",
  "volt gear",
  "store",
  "ecommerce store",
  "e commerce store",
  "e-commerce store",
]);

export function shouldReplaceBrandName(name?: string | null): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return true;
  return PLACEHOLDER_BRAND_NAMES.has(trimmed.toLowerCase());
}

/** Checkout sometimes stores the shop name as the customer. Letters should not greet that. */
export function resolveCustomerDisplayName(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed || shouldReplaceBrandName(trimmed)) return "Customer";
  return trimmed;
}
