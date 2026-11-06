/** A privacy signal on the current request overrides earlier stored consent. */
export function effectiveCheckoutTrackingConsent(input: { request: Request; consent?: string | null }): string {
  return input.request.headers.get("sec-gpc") === "1" || input.request.headers.get("dnt") === "1"
    ? "essential"
    : input.consent ?? "essential";
}
