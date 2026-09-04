import { PromoPopupModal } from "@/components/promotions/promo-popup-modal";
import { listPromoCodes } from "@/lib/db/promo-store";
import { formatPrice } from "@/lib/utils";
import { pickWelcomeCoupon } from "@/lib/welcome-coupon-rules";

export async function StorefrontPromoPopup({
  minOrder,
}: {
  minOrder?: number;
}) {
  let code: string | null = null;
  try {
    const promos = await listPromoCodes();
    code = pickWelcomeCoupon(promos)?.code ?? null;
  } catch {
    code = null;
  }

  return (
    <PromoPopupModal
      code={code}
      minOrderLabel={minOrder && minOrder > 0 ? formatPrice(minOrder) : "Rs. 3,000"}
    />
  );
}
