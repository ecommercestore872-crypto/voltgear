import { getServiceClient } from "@/lib/supabase/server";

import { orphanVisitorIds, planAnalyticsCleanup } from "./analytics-cleanup-rules";

const CLEANUP_LIMIT = 100;

export async function runAnalyticsCleanup(now = new Date()): Promise<void> {
  try {
    const db = getServiceClient();
    const plan = planAnalyticsCleanup(now);

    await db
      .from("analytics_sessions")
      .delete()
      .lt("last_activity_at", plan.sessionLastActivityBefore.toISOString())
      .limit(CLEANUP_LIMIT);

    const { data: oldVisitors, error: visitorError } = await db
      .from("analytics_visitors")
      .select("id")
      .lt("last_seen_at", plan.visitorLastSeenBefore.toISOString())
      .limit(CLEANUP_LIMIT);

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
