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
]);

export function shouldReplaceBrandName(name?: string | null): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return true;
  return PLACEHOLDER_BRAND_NAMES.has(trimmed.toLowerCase());
}
