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

export const EMPTY_ORDER_ATTRIBUTION: OrderAttributionSnapshot = {
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

const MAX_LEN = 2048;

function cap(value: string | undefined | null, max = 80): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export type ClickAttributionInput = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_id?: string;
  ttclid?: string;
  fbclid?: string;
  gclid?: string;
};

export function orderAttributionFromClick(
  input: ClickAttributionInput | null | undefined,
): OrderAttributionSnapshot {
  if (!input) return { ...EMPTY_ORDER_ATTRIBUTION };
  return {
    ...EMPTY_ORDER_ATTRIBUTION,
    attrib_source: cap(input.utm_source),
    attrib_medium: cap(input.utm_medium),
    attrib_campaign: cap(input.utm_campaign),
    attrib_campaign_id: cap(input.utm_id),
    attrib_ttclid: cap(input.ttclid, MAX_LEN),
    attrib_fbclid: cap(input.fbclid, MAX_LEN),
    attrib_gclid: cap(input.gclid, MAX_LEN),
  };
}

export function hasOrderAttribution(snapshot: OrderAttributionSnapshot): boolean {
  return Boolean(
    snapshot.attrib_source ||
      snapshot.attrib_medium ||
      snapshot.attrib_campaign ||
      snapshot.attrib_campaign_id ||
      snapshot.attrib_ttclid ||
      snapshot.attrib_fbclid ||
      snapshot.attrib_gclid,
  );
}
