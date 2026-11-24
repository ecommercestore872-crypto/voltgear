import { allowsAdvertising, parseCookieConsent } from "./cookie-consent";

export const META_CONSENT_STORAGE_KEY = "bnt-cookie-consent";

export function hasMetaPrivacyOptOut(input: {
  gpc?: string | boolean | null;
  dnt?: string | null;
}): boolean {
  return input.gpc === true || input.gpc === "1" ||
    input.dnt === "1" || input.dnt?.toLowerCase() === "yes";
}

/**
 * Meta measurement does not need the cookie banner to be answered. It runs
 * unless the visitor explicitly saved a choice without advertising
 * ("Reject optional" or analytics-only). No saved choice counts as allowed.
 */
export function metaConsentAllows(stored: unknown): boolean {
  const choice = parseCookieConsent(stored);
  return choice === null || allowsAdvertising(choice);
}

export function canSendMetaServerEvent(
  consent: string | null | undefined,
  headers: Headers,
): boolean {
  return metaConsentAllows(consent) && !hasMetaPrivacyOptOut({
    gpc: headers.get("sec-gpc"),
    dnt: headers.get("dnt"),
  });
}

export function canSendMetaBrowserEvent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const browser = window.navigator as Navigator & {
      globalPrivacyControl?: boolean;
      msDoNotTrack?: string;
    };
    return metaConsentAllows(window.localStorage.getItem(META_CONSENT_STORAGE_KEY)) &&
      !hasMetaPrivacyOptOut({
        gpc: browser.globalPrivacyControl,
        dnt: browser.doNotTrack || browser.msDoNotTrack,
      });
  } catch {
    return false;
  }
}
