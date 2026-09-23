import { AppliedPromotionResult, BankPaymentOffer, DiscountCoupon } from "./promotion-types";

/**
 * Evaluates a promo coupon code against an order total.
 */
export function evaluateDiscountCoupon(
  coupon: DiscountCoupon,
  orderTotal: number
): AppliedPromotionResult {
  if (!coupon.isActive) {
    return { valid: false, discountAmount: 0, finalOrderTotal: orderTotal, message: "Coupon code is inactive." };
  }

  const now = new Date().toISOString();
  if (coupon.startsAt > now || coupon.expiresAt < now) {
    return { valid: false, discountAmount: 0, finalOrderTotal: orderTotal, message: "Coupon code has expired." };
  }

  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      finalOrderTotal: orderTotal,
      message: `Minimum order amount of Rs. ${coupon.minOrderAmount.toLocaleString()} required.`,
    };
  }

  if (coupon.maxUsageCount && coupon.usageCount >= coupon.maxUsageCount) {
    return { valid: false, discountAmount: 0, finalOrderTotal: orderTotal, message: "Coupon usage limit reached." };
  }

  let discountAmount = 0;
  if (coupon.type === "PERCENTAGE") {
    discountAmount = Math.round((orderTotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(orderTotal, coupon.value);
  }

  return {
    valid: true,
    discountAmount,
    finalOrderTotal: Math.max(0, orderTotal - discountAmount),
    message: `Applied coupon ${coupon.code} (-Rs. ${discountAmount.toLocaleString()})`,
  };
}

/**
 * Evaluates bank or mobile wallet checkout discounts (EasyPaisa, JazzCash, HBL, Meezan).
 */
export function evaluateBankPaymentOffer(
  offer: BankPaymentOffer,
  orderTotal: number
): AppliedPromotionResult {
  if (!offer.isActive) {
    return { valid: false, discountAmount: 0, finalOrderTotal: orderTotal, message: "Bank offer inactive." };
  }

  const rawDiscount = Math.round((orderTotal * offer.discountPercentage) / 100);
  const discountAmount = Math.min(rawDiscount, offer.maxDiscountAmount);

  return {
    valid: true,
    discountAmount,
    finalOrderTotal: Math.max(0, orderTotal - discountAmount),
    message: `Applied ${offer.bankName} ${offer.discountPercentage}% Instant Discount (-Rs. ${discountAmount.toLocaleString()})`,
  };
}
