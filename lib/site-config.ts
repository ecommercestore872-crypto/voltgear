import { SHOPPER_BRAND } from "@/lib/brand";
import type { SiteSettings } from "@/lib/types";

/**
 * Single source of truth for customer-facing business configuration.
 *
 * Flow:
 *   Sanity siteSettings
 *     → getSettings() / fetchFromSanity (server)
 *     → normalizeSettings()  ← the ONLY normalization + fallback layer
 *     → useSiteConfig() / server consumers
 *     → customer-facing components
 *
 * Rule: components must NOT define their own business fallbacks.
 * Rule: missing/unverified data hides gracefully — it is never replaced
 * with an invented number or claim.
 */

export interface AnnouncementConfig {
  enabled: boolean;
  message: string | null;
  countdownEnabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PublicSiteConfig {
  storeName: string;
  currency: string;
  freeShippingThreshold: number;
  shippingFee: number;
  codEnabled: boolean;
  warrantyMonths: number | null;
  returnWindowDays: number | null;
  supportEmail: string | null;
  supportPhone: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  announcement: AnnouncementConfig;
}

/**
 * Canonical operational fallbacks — used only when Sanity settings are
 * missing entirely. Marketing claims (ratings, customer counts, urgency,
 * warranty/return durations) intentionally have NO fallback.
 */
const FALLBACK_STORE_NAME = SHOPPER_BRAND.fallbackStoreName;
const FALLBACK_CURRENCY = "PKR";
const FALLBACK_FREE_SHIPPING_THRESHOLD = 5000;
const FALLBACK_SHIPPING_FEE = 199;

export function normalizeSettings(
  settings: SiteSettings | null | undefined
): PublicSiteConfig {
  const socials = settings?.socialLinks ?? [];
  const socialUrl = (platforms: string[]) =>
    socials.find((s) => platforms.includes((s.platform ?? "").toLowerCase()))
      ?.url || null;

  const warrantyMonths =
    typeof settings?.warrantyMonths === "number" &&
    settings.warrantyMonths > 0
      ? settings.warrantyMonths
      : null;

  const returnWindowDays =
    typeof settings?.returnWindowDays === "number" &&
    settings.returnWindowDays > 0
      ? settings.returnWindowDays
      : null;

  return {
    storeName: settings?.brandName?.trim() || FALLBACK_STORE_NAME,
    currency: settings?.currency?.trim() || FALLBACK_CURRENCY,
    freeShippingThreshold:
      typeof settings?.freeShippingThreshold === "number"
        ? settings.freeShippingThreshold
        : FALLBACK_FREE_SHIPPING_THRESHOLD,
    shippingFee:
      typeof settings?.shippingFee === "number"
        ? settings.shippingFee
        : FALLBACK_SHIPPING_FEE,
    codEnabled: settings?.codEnabled !== false,
    warrantyMonths,
    returnWindowDays,
    supportEmail: settings?.email?.trim() || null,
    supportPhone: settings?.phone?.trim() || null,
    whatsappNumber: settings?.whatsappNumber?.trim() || null,
    instagramUrl: socialUrl(["instagram"]),
    tiktokUrl: socialUrl(["tiktok"]),
    facebookUrl: socialUrl(["facebook"]),
    announcement: {
      enabled: settings?.announcement?.enabled === true,
      message: settings?.announcement?.message?.trim() || null,
      countdownEnabled: settings?.announcement?.countdownEnabled === true,
      startsAt: settings?.announcement?.startsAt || null,
      endsAt: settings?.announcement?.endsAt || null,
    },
  };
}

/**
 * A countdown may only run while the promotion window is active:
 * enabled && countdownEnabled && startsAt <= now < endsAt.
 * Before it starts or after it expires the countdown is hidden — it never
 * restarts and never shows 00:00:00.
 */
export function isAnnouncementCountdownActive(
  announcement: AnnouncementConfig,
  now: number = Date.now()
): boolean {
  if (!announcement.enabled || !announcement.countdownEnabled) return false;
  if (!announcement.startsAt || !announcement.endsAt) return false;
  const start = new Date(announcement.startsAt).getTime();
  const end = new Date(announcement.endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return now >= start && now < end;
}

/** "2-year warranty" / "14-month warranty" — only called with a configured value. */
export function warrantyLabel(months: number): string {
  if (months >= 12 && months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1-year warranty" : `${years}-year warranty`;
  }
  return `${months}-month warranty`;
}

/** "30-day returns" — only called with a configured value. */
export function returnsLabel(days: number): string {
  return `${days}-day returns`;
}