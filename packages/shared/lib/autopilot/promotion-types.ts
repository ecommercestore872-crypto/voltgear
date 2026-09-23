export interface DiscountCoupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number; // e.g. 10 for 10% or 500 for Rs 500
  minOrderAmount?: number;
  maxUsageCount?: number;
  usageCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface BankPaymentOffer {
  id: string;
  bankName: string; // e.g. "EasyPaisa", "JazzCash", "HBL", "Meezan Bank", "Bank Alfalah"
  discountPercentage: number; // e.g. 10%
  maxDiscountAmount: number; // Cap e.g. Rs 1000
  cardType?: "DEBIT" | "CREDIT" | "WALLET";
  isActive: boolean;
}

export interface FlashCampaign {
  id: string;
  title: string; // e.g. "Blessed Friday Flash Sale"
  bannerText: string;
  discountPercentage: number;
  productIds: string[];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface AppliedPromotionResult {
  valid: boolean;
  discountAmount: number;
  finalOrderTotal: number;
  message: string;
}
