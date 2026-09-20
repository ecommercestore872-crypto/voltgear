import { getServiceClient } from "@/lib/supabase/server";

import {
  isAnalyticsUuid,
  readCookieValue,
} from "./analytics-ingest-rules";
import { orderAttributionFromSession } from "./analytics-checkout-rules";
import { SESSION_IDLE_MS } from "./analytics-session-rules";
import { updateOrderAttributionRow } from "./store";

const SESSION_COOKIE = "vg_sid";

export async function attachOrderAttribution(
  orderId: string,
  request: Request
): Promise<ReturnType<typeof orderAttributionFromSession> | null> {
  try {
    const sid = readCookieValue(request.headers.get("cookie"), SESSION_COOKIE);
    if (!sid || !isAnalyticsUuid(sid)) {
      return null;
    }

    const { data, error } = await getServiceClient()
      .from("analytics_sessions")
      .select(
        "id, visitor_id, last_activity_at, source, medium, campaign, campaign_id, ttclid, fbclid, gclid"
      )
      .eq("id", sid)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const lastActivity = new Date(String(data.last_activity_at)).getTime();
    if (!Number.isFinite(lastActivity) || Date.now() - lastActivity > SESSION_IDLE_MS) {
      return null;
    }

    const snapshot = orderAttributionFromSession({
      id: String(data.id),
      visitorId: String(data.visitor_id),
      source: data.source != null ? String(data.source) : null,
      medium: data.medium != null ? String(data.medium) : null,
      campaign: data.campaign != null ? String(data.campaign) : null,
      campaignId: data.campaign_id != null ? String(data.campaign_id) : null,
      ttclid: data.ttclid != null ? String(data.ttclid) : null,
      fbclid: data.fbclid != null ? String(data.fbclid) : null,
      gclid: data.gclid != null ? String(data.gclid) : null,
    });

    await updateOrderAttributionRow(orderId, snapshot);
    return snapshot;
  } catch {
    console.error("[analytics-checkout]", "attach failed");
    return null;
  }
}
