/** Stable JSON fingerprint for admin form dirty checks. */
export function adminFormFingerprint(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}