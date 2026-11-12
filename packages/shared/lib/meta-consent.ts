export const META_CONSENT_STORAGE_KEY = "bnt-cookie-consent";

export function hasMetaPrivacyOptOut(input: {
  gpc?: string | boolean | null;
  dnt?: string | null;
}): boolean {
  return input.gpc === true || input.gpc === "1" ||
    input.dnt === "1" || input.dnt?.toLowerCase() === "yes";
}

export function canSendMetaServerEvent(
  consent: string | null | undefined,
  headers: Headers,
): boolean {
  return consent === "all" && !hasMetaPrivacyOptOut({
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
    return window.localStorage.getItem(META_CONSENT_STORAGE_KEY) === "all" &&
      !hasMetaPrivacyOptOut({
        gpc: browser.globalPrivacyControl,
        dnt: browser.doNotTrack || browser.msDoNotTrack,
      });
  } catch {
    return false;
  }
}
