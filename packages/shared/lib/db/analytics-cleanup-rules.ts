export function planAnalyticsCleanup(now: Date): {
  sessionLastActivityBefore: Date;
  visitorLastSeenBefore: Date;
} {
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    sessionLastActivityBefore: new Date(now.getTime() - 90 * dayMs),
    visitorLastSeenBefore: new Date(now.getTime() - 365 * dayMs),
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
