export type AttributionSession = {
  id: string;
  visitorId: string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  campaignId?: string | null;
  ttclid?: string | null;
  fbclid?: string | null;
  gclid?: string | null;
};

export type OrderAttributionSnapshot = {
  analytics_session_id: string | null;
  analytics_visitor_id: string | null;
  attrib_source: string | null;
  attrib_medium: string | null;
  attrib_campaign: string | null;
  attrib_campaign_id: string | null;
  attrib_ttclid: string | null;
  attrib_fbclid: string | null;
  attrib_gclid: string | null;
};

const NULL_SNAPSHOT: OrderAttributionSnapshot = {
  analytics_session_id: null,
  analytics_visitor_id: null,
  attrib_source: null,
  attrib_medium: null,
  attrib_campaign: null,
  attrib_campaign_id: null,
  attrib_ttclid: null,
  attrib_fbclid: null,
  attrib_gclid: null,
};

export function orderAttributionFromSession(
  session: AttributionSession | null
): OrderAttributionSnapshot {
  if (!session) {
    return { ...NULL_SNAPSHOT };
  }
  return {
    analytics_session_id: session.id,
    analytics_visitor_id: session.visitorId,
    attrib_source: session.source ?? null,
    attrib_medium: session.medium ?? null,
    attrib_campaign: session.campaign ?? null,
    attrib_campaign_id: session.campaignId ?? null,
    attrib_ttclid: session.ttclid ?? null,
    attrib_fbclid: session.fbclid ?? null,
    attrib_gclid: session.gclid ?? null,
  };
}
