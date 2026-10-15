import { resolveShippingAndTotal, GIFT_WRAP_FEE } from "@/lib/checkout-server";
import {
  applyDealsToCart,
  promoBlockedByDeal,
  type DealRecord,
} from "@/lib/db/deal-rules";
import { applyPromoToTotals, normalizePromoCode } from "@/lib/db/promo-rules";
import { countPriorOrdersForEmail, getPromoByCode } from "@/lib/db/promo-store";
import type { ResolvedOrderItem } from "@/lib/checkout-server";

export type CheckoutPricing = {
  finalShipping: number;
  finalTotal: number;
  discount: number;
  appliedPromo: string | null;
};

export type CheckoutPricingResult =
  | { ok: true; pricing: CheckoutPricing }
  | { ok: false; error: string; status: 400 | 503; code?: "promo_error" };

export async function resolveCheckoutPricing(input: {
  lines: ResolvedOrderItem[];
  subtotal: number;
  gift: boolean;
  promoCode?: string;
  email: string;
  deals: DealRecord[];
}): Promise<CheckoutPricingResult> {
  let dealDiscount = 0;
  try {
    dealDiscount = applyDealsToCart(
      input.lines.map((line) => ({
        slug: line.slug,
        quantity: line.quantity,
        price: line.price,
      })),
      input.deals,
    ).discount;
  } catch (error) {
    console.error("[checkout] deals", error);
  }

  const merchandise = Math.max(
    0,
    Math.round((input.subtotal - dealDiscount) * 100) / 100,
  );
  const shipped = await resolveShippingAndTotal(merchandise, input.gift);
  let finalShipping = shipped.shipping;
  let finalTotal = shipped.total;
  let discount = dealDiscount;
  let appliedPromo: string | null = null;

  const promoCode = normalizePromoCode(input.promoCode);
  if (!promoCode) {
    return {
      ok: true,
      pricing: { finalShipping, finalTotal, discount, appliedPromo },
    };
  }

  try {
    const promo = await getPromoByCode(promoCode);
    if (!promo) {
      return { ok: false, error: "That promo code is not valid.", status: 400 };
    }
    if (promoBlockedByDeal(dealDiscount, promo.type)) {
      return {
        ok: false,
        error:
          "A pair deal is already applied. Percent and rupee codes cannot stack on the same order.",
        status: 400,
      };
    }

    const priorOrders = await countPriorOrdersForEmail(input.email);
    const applied = applyPromoToTotals(promo, {
      subtotal: merchandise,
      shipping: finalShipping,
      giftWrapFee: input.gift ? GIFT_WRAP_FEE : 0,
      isFirstOrder: priorOrders === 0,
    });
    if (!applied.ok) {
      return { ok: false, error: applied.error, status: 400 };
    }

    finalShipping = applied.shipping;
    finalTotal = applied.total;
    discount =
      Math.round(
        (dealDiscount +
          (promo.type === "free_shipping" ? 0 : applied.discount)) *
          100,
      ) / 100;
    appliedPromo = applied.code;
  } catch (error) {
    console.error("[checkout] promo", error);
    return {
      ok: false,
      error: "Could not apply promo code. Try again without it.",
      status: 503,
      code: "promo_error",
    };
  }

  return {
    ok: true,
    pricing: { finalShipping, finalTotal, discount, appliedPromo },
  };
}
