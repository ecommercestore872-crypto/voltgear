/** Kept out of messaging.ts: that file is server-only (Buffer) and must not reach client bundles. */
/**
 * Normalize a Pakistani phone number to E.164 (+92XXXXXXXXX).
 * Accepts "0300 1234567", "+92 300 1234567", "3001234567", "92 300…" etc.
 * Returns null when the number doesn't look like a valid mobile number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/[^\d]/g, "");

  if (digits.length === 10 && digits.startsWith("3")) {
    return `+92${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("03")) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("923")) {
    return `+${digits}`;
  }
  if (digits.length === 13 && digits.startsWith("00923")) {
    return `+${digits.slice(2)}`;
  }
  
  return null;
}
