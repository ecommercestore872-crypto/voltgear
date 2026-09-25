import { getServiceClient } from "@/lib/supabase/server";

import { orphanVisitorIds, planAnalyticsCleanup } from "./analytics-cleanup-rules";

/** Per daily cron run — keeps DB size bounded without long transactions. */
const EVENT_DELETE_LIMIT = 5_000;
const SESSION_DELETE_LIMIT = 2_000;
const VISITOR_PROBE_LIMIT = 2_000;

export async function runAnalyticsCleanup(now = new Date()): Promise<void> {
  try {
    const db = getServiceClient();
    const plan = planAnalyticsCleanup(now);

    await db
      .from("analytics_events")
      .delete()
      .lt("occurred_at", plan.eventsOccurredBefore.toISOString())
      .limit(EVENT_DELETE_LIMIT);

    await db
      .from("analytics_sessions")
      .delete()
      .lt("last_activity_at", plan.sessionLastActivityBefore.toISOString())
      .limit(SESSION_DELETE_LIMIT);

    const { data: oldVisitors, error: visitorError } = await db
      .from("analytics_visitors")
      .select("id")
      .lt("last_seen_at", plan.visitorLastSeenBefore.toISOString())
      .limit(VISITOR_PROBE_LIMIT);

    if (visitorError || !oldVisitors?.length) {
      return;
    }

    const ids = oldVisitors.map((row) => String(row.id));
    const { data: stillActive, error: sessionProbeError } = await db
      .from("analytics_sessions")
      .select("visitor_id")
      .in("visitor_id", ids);

    const orphans = orphanVisitorIds(
      ids,
      (stillActive ?? []).map((row) => String(row.visitor_id)),
      Boolean(sessionProbeError)
    );
    if (!orphans?.length) {
      return;
    }

    await db.from("analytics_visitors").delete().in("id", orphans);
  } catch {
    // fail-open: missing tables/columns or lookup errors must not affect ingest
  }
}
