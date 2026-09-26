/** Inactive customers: no order in this window qualify for win-back. */
export const WINBACK_INACTIVE_MS = 90 * 24 * 60 * 60 * 1000;

/** Cap win-back enqueues per cron run (protect Resend + cron duration). */
export const WINBACK_MAX_QUEUE_PER_CRON = 75;

export function winbackInactiveCutoffIso(nowMs = Date.now()): string {
  return new Date(nowMs - WINBACK_INACTIVE_MS).toISOString();
}

export function isEligibleWinbackEmail(email: string | null | undefined): boolean {
  const e = email?.trim() ?? "";
  return e.length > 3 && e.includes("@");
}
