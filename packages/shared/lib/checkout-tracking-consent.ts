/** A privacy signal on the current request overrides earlier stored consent. */
import { hasMetaPrivacyOptOut } from "./meta-consent";
export function effectiveCheckoutTrackingConsent(input: { request: Request; consent?: string | null }): string {
  return hasMetaPrivacyOptOut({ gpc: input.request.headers.get("sec-gpc"), dnt: input.request.headers.get("dnt") })
    ? "essential"
    : input.consent ?? "essential";
}
