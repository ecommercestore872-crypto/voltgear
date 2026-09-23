import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { orderAttributionFromSession } from "./analytics-checkout-rules";

describe("orderAttributionFromSession", () => {
  it("returns all-null snapshot fields when the session is missing", () => {
    const snapshot = orderAttributionFromSession(null);
    assert.deepEqual(snapshot, {
      analytics_session_id: null,
      analytics_visitor_id: null,
      attrib_source: null,
      attrib_medium: null,
      attrib_campaign: null,
      attrib_campaign_id: null,
      attrib_ttclid: null,
      attrib_fbclid: null,
      attrib_gclid: null,
    });
  });

  it("copies session, visitor, and compact attribution fields", () => {
    const snapshot = orderAttributionFromSession({
      id: "22222222-2222-4222-8222-222222222222",
      visitorId: "11111111-1111-4111-8111-111111111111",
      source: "tiktok",
      medium: "cpc",
      campaign: "spring",
      campaignId: "camp-1",
      ttclid: "tt-1",
      fbclid: "fb-1",
      gclid: "g-1",
    });
    assert.deepEqual(snapshot, {
      analytics_session_id: "22222222-2222-4222-8222-222222222222",
      analytics_visitor_id: "11111111-1111-4111-8111-111111111111",
      attrib_source: "tiktok",
      attrib_medium: "cpc",
      attrib_campaign: "spring",
      attrib_campaign_id: "camp-1",
      attrib_ttclid: "tt-1",
      attrib_fbclid: "fb-1",
      attrib_gclid: "g-1",
    });
  });
});
