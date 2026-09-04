import { SHOPPER_BRAND } from "./brand";
import {
  isPromoCurrentlyValid,
  type PromoCodeRecord,
} from "./db/promo-rules";

export const WELCOME_POPUP_STORAGE_KEY = "bnt_welcome_seen";
export const WELCOME_POPUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const WELCOME_POPUP_DELAY_MS = 5000;

export function pickWelcomeCoupon(
  promos: PromoCodeRecord[],
  now = new Date()
): PromoCodeRecord | null {
  const live = promos.filter((p) => isPromoCurrentlyValid(p, now).ok);
  const preferred = live.find(
    (p) => p.code === SHOPPER_BRAND.preferredWelcomeCode
  );
  if (preferred) return preferred;
  return (
    live.find((p) => p.firstOrderOnly && p.type === "percent") ?? null
  );
}

export function welcomePopupStillHidden(
  seenAtIso: string | null,
  now = Date.now()
): boolean {
  if (!seenAtIso) return false;
  const seen = Date.parse(seenAtIso);
  if (Number.isNaN(seen)) return false;
  return now - seen < WELCOME_POPUP_TTL_MS;
}
