/** Stable JSON fingerprint for admin form dirty checks. */
export function adminFormFingerprint(value: unknown): string {
  return JSON.stringify(value);
}