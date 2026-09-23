import { ExceptionSeverity, OperationalException } from "./command-types";

/**
 * Calculates priority score for sorting exceptions in the Owner Command Center.
 * Higher score = higher priority.
 */
export function calculatePriorityScore(ex: OperationalException): number {
  const severityMultipliers: Record<ExceptionSeverity, number> = {
    CRITICAL: 1000,
    HIGH: 500,
    MEDIUM: 200,
    LOW: 50,
    INFO: 10,
  };

  const severityBase = severityMultipliers[ex.severity] || 0;
  const financialScore = Math.min(500, (ex.amountAtRisk || 0) / 100);
  const occurrenceScore = Math.min(100, ex.occurrenceCount * 10);

  return severityBase + financialScore + occurrenceScore;
}

/**
 * Deduplicates raw events by matching dedupKey. Updates occurrence count if exists.
 */
export function deduplicateExceptions(
  existingExceptions: OperationalException[],
  incomingException: OperationalException
): OperationalException[] {
  const index = existingExceptions.findIndex((e) => e.dedupKey === incomingException.dedupKey);

  if (index >= 0) {
    const updated = [...existingExceptions];
    updated[index] = {
      ...updated[index],
      occurrenceCount: updated[index].occurrenceCount + 1,
      lastSeenAt: new Date().toISOString(),
      amountAtRisk: Math.max(updated[index].amountAtRisk || 0, incomingException.amountAtRisk || 0),
    };
    return updated;
  }

  return [incomingException, ...existingExceptions];
}
