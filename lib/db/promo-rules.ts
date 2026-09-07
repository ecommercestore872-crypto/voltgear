export type PromoType = "percent" | "fixed" | "free_shipping";

export type PromoCodeRecord = {
  code: string;
  type: PromoType;
  value: number;
  firstOrderOnly: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** Optional cap; null/undefined = unlimited. */
  maxUsage?: number | null;
  usageCount?: number;
};

export type PromoApplyResult =
  | {
      ok: true;
      code: string;
      type: PromoType;
      discount: number;
      shipping: number;
      total: number;
    }
  | { ok: false; error: string };

export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function parsePromoType(raw: unknown): PromoType | null {
  if (raw === "percent" || raw === "fixed" || raw === "free_shipping") return raw;
  return null;
}

export function validatePromoAdminInput(input: {
  code?: unknown;
  type?: unknown;
  value?: unknown;
  firstOrderOnly?: unknown;
  active?: unknown;
}):
  | {
      ok: true;
      data: {
        code: string;
        type: PromoType;
        value: number;
        firstOrderOnly: boolean;
        active: boolean;
      };
    }
  | { ok: false; error: string } {
  const code = normalizePromoCode(input.code);
  if (!code || code.length < 2) return { ok: false, error: "Code is required." };
  if (code.length > 32) return { ok: false, error: "Code is too long." };
  const type = parsePromoType(input.type);
  if (!type) return { ok: false, error: "Invalid discount type." };
  const value = Number(input.value ?? 0);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: "Value must be zero or more." };
  }
  if (type === "percent" && value > 100) {
    return { ok: false, error: "Percent cannot exceed 100." };
  }
  if (type === "free_shipping") {
    // value unused
  }
  return {
    ok: true,
    data: {
      code,
      type,
      value: type === "free_shipping" ? 0 : value,
      firstOrderOnly: Boolean(input.firstOrderOnly),
      active: input.active === undefined ? true : Boolean(input.active),
    },
  };
}

export function isPromoCurrentlyValid(
  promo: PromoCodeRecord,
  now = new Date()
): { ok: true } | { ok: false; error: string } {
  if (!promo.active) return { ok: false, error: "This code is not active." };
  const t = now.getTime();
  if (promo.startsAt) {
    const s = Date.parse(promo.startsAt);
    if (!Number.isNaN(s) && t < s) {
      return { ok: false, error: "This code is not valid yet." };
    }
  }
  if (promo.endsAt) {
    const e = Date.parse(promo.endsAt);
    if (!Number.isNaN(e) && t > e) {
      return { ok: false, error: "This code has expired." };
    }
  }
  return { ok: true };
}

/**
 * Apply a promo to subtotal + base shipping (already threshold-aware).
 * Discount never exceeds subtotal; free_shipping zeros shipping only.
 */
export function applyPromoToTotals(
  promo: PromoCodeRecord,
  input: {
    subtotal: number;
    shipping: number;
    giftWrapFee?: number;
    isFirstOrder: boolean;
    now?: Date;
  }
): PromoApplyResult {
  const valid = isPromoCurrentlyValid(promo, input.now ?? new Date());
  if (!valid.ok) return valid;
  if (promo.firstOrderOnly && !input.isFirstOrder) {
    return { ok: false, error: "This code is for first orders only." };
  }
  const maxUsage = promo.maxUsage;
  if (
    maxUsage != null &&
    Number.isFinite(maxUsage) &&
    maxUsage > 0 &&
    (promo.usageCount ?? 0) >= maxUsage
  ) {
    return { ok: false, error: "This code has reached its usage limit." };
  }

  const gift = input.giftWrapFee ?? 0;
  let shipping = input.shipping;
  let discount = 0;

  if (promo.type === "free_shipping") {
    discount = shipping;
    shipping = 0;
  } else if (promo.type === "percent") {
    discount = Math.round((input.subtotal * promo.value) / 100);
  } else {
    discount = Math.round(promo.value);
  }

  if (discount > input.subtotal && promo.type !== "free_shipping") {
    discount = input.subtotal;
  }
  if (promo.type === "free_shipping") {
    // discount is the shipping waived; total uses shipping=0
    discount = input.shipping;
  }

  const total =
    Math.round((input.subtotal - (promo.type === "free_shipping" ? 0 : discount) + shipping + gift) * 100) /
    100;

  return {
    ok: true,
    code: promo.code,
    type: promo.type,
    discount: promo.type === "free_shipping" ? input.shipping : discount,
    shipping,
    total: Math.max(0, total),
  };
}
