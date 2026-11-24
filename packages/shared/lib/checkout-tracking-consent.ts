/** A privacy signal on the current request overrides earlier stored consent. */
import { canSendMetaServerEvent, hasMetaPrivacyOptOut } from "./meta-consent";
export function effectiveCheckoutTrackingConsent(input: { request: Request; consent?: string | null }): string {
  return hasMetaPrivacyOptOut({ gpc: input.request.headers.get("sec-gpc"), dnt: input.request.headers.get("dnt") })
    ? "essential"
    : input.consent ?? "essential";
}

/** Meta Purchase does not wait for the banner; only an explicit reject or a privacy signal stops it. */
export function metaCheckoutTrackingAllowed(input: { request: Request; consent?: string | null }): boolean {
  return canSendMetaServerEvent(input.consent ?? null, input.request.headers);
}
