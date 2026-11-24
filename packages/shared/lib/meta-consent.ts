import { parseCookieConsent } from "./cookie-consent";
import { advertisingTrackingAllowed, privacySignalStopsTracking } from "./tracking-policy";

export const META_CONSENT_STORAGE_KEY = "bnt-cookie-consent";

export function hasMetaPrivacyOptOut(input: {
  gpc?: string | boolean | null;
  dnt?: string | null;
}): boolean {
  return privacySignalStopsTracking(input.gpc === true || input.gpc === "1" ||
    input.dnt === "1" || input.dnt?.toLowerCase() === "yes");
}

/** Under the current policy (see tracking-policy.ts) every visitor is measured. */
export function metaConsentAllows(stored: unknown): boolean {
  const choice = parseCookieConsent(stored);
  return choice === null || advertisingTrackingAllowed(choice);
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
