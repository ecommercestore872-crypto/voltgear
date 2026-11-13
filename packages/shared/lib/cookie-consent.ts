export const COOKIE_CONSENT_STORAGE_KEY = "bnt-cookie-consent";
export const COOKIE_CONSENT_CHANGE_EVENT = "bnt-cookie-consent-change";
export const COOKIE_CONSENT_OPEN_EVENT = "bnt-cookie-consent-open";

/** Legacy values remain valid so existing preferences are preserved. */
export type CookieConsentChoice = "essential" | "analytics" | "advertising" | "all";

export function parseCookieConsent(value: unknown): CookieConsentChoice | null {
  return value === "essential" || value === "analytics" || value === "advertising" || value === "all"
    ? value
    : null;
}

export function allowsAnalytics(choice: unknown): boolean {
  return choice === "analytics" || choice === "all";
}

export function allowsAdvertising(choice: unknown): boolean {
  return choice === "advertising" || choice === "all";
}

export function optionalConsentRevoked(previous: unknown, next: unknown): boolean {
  return (allowsAnalytics(previous) && !allowsAnalytics(next)) ||
    (allowsAdvertising(previous) && !allowsAdvertising(next));
}

export function consentFromPreferences(analytics: boolean, advertising: boolean): CookieConsentChoice {
  if (analytics && advertising) return "all";
  if (analytics) return "analytics";
  if (advertising) return "advertising";
  return "essential";
}

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Respect an explicit browser privacy signal for optional advertising. */
export function browserPrivacyOptOut(): boolean {
  if (typeof navigator === "undefined") return false;
  const browser = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return browser.globalPrivacyControl === true || browser.doNotTrack === "1" ||
    browser.msDoNotTrack === "1";
}

export function parseConsentMetric(value: unknown): { event: "shown" | "opened" | "saved"; choice?: CookieConsentChoice } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== "event" && key !== "choice")) return null;
  if (row.event !== "shown" && row.event !== "opened" && row.event !== "saved") return null;
  if (row.event === "saved") {
    const choice = parseCookieConsent(row.choice);
    return choice ? { event: "saved", choice } : null;
  }
  return row.choice === undefined ? { event: row.event } : null;
}
