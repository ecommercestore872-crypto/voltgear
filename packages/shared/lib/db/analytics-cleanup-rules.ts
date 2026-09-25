const SESSION_RETENTION_DAYS = 90;
const VISITOR_RETENTION_DAYS = 365;

export function planAnalyticsCleanup(now: Date): {
  sessionLastActivityBefore: Date;
  visitorLastSeenBefore: Date;
  eventsOccurredBefore: Date;
} {
  const dayMs = 24 * 60 * 60 * 1000;
  const sessionCutoff = new Date(now.getTime() - SESSION_RETENTION_DAYS * dayMs);
  return {
    sessionLastActivityBefore: sessionCutoff,
    visitorLastSeenBefore: new Date(now.getTime() - VISITOR_RETENTION_DAYS * dayMs),
    eventsOccurredBefore: sessionCutoff,
  };
}

/** Returns orphan ids to delete, or null to skip delete when the session probe failed. */
export function orphanVisitorIds(
  candidateIds: string[],
  stillActiveVisitorIds: string[] | null,
  probeFailed: boolean
): string[] | null {
  if (probeFailed) return null;
  const keep = new Set(stillActiveVisitorIds ?? []);
  return candidateIds.filter((id) => !keep.has(id));
}
