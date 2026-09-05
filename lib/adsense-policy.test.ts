import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADSENSE_CERT_AUTHORITY_ID,
  ADSENSE_REQUIRED_PRIVACY_FACTS,
  adsTxtBody,
  normalizeAdsensePublisherId,
} from "./adsense-policy";

describe("normalizeAdsensePublisherId", () => {
  it("accepts pub- and ca-pub- forms and rejects placeholders", () => {
    assert.deepEqual(normalizeAdsensePublisherId("pub-1234567890123456"), {
      scriptClient: "ca-pub-1234567890123456",
      adsTxtPub: "pub-1234567890123456",
    });
    assert.equal(
      normalizeAdsensePublisherId("ca-pub-1234567890123456")?.adsTxtPub,
      "pub-1234567890123456"
    );
    assert.equal(normalizeAdsensePublisherId("pub-0000000000000000"), null);
    assert.equal(normalizeAdsensePublisherId(""), null);
    assert.equal(normalizeAdsensePublisherId("not-a-pub"), null);
    assert.deepEqual(normalizeAdsensePublisherId("ca-pub-1159111109427878"), {
      scriptClient: "ca-pub-1159111109427878",
      adsTxtPub: "pub-1159111109427878",
    });
  });
});

describe("adsTxtBody", () => {
  it("falls back to the Buy n Try publisher id when env is empty", () => {
    const body = adsTxtBody("");
    assert.match(body, /google.com, pub-1159111109427878, DIRECT/);
  });

  it("emits the Google DIRECT line from official ads.txt format", () => {
    const body = adsTxtBody("ca-pub-1234567890123456");
    assert.equal(
      body.includes(
        `google.com, pub-1234567890123456, DIRECT, ${ADSENSE_CERT_AUTHORITY_ID}`
      ),
      true
    );
  });
});

describe("ADSENSE_REQUIRED_PRIVACY_FACTS", () => {
  it("covers Google's required advertising-cookie disclosures", () => {
    const blob = ADSENSE_REQUIRED_PRIVACY_FACTS.join(" ");
    assert.match(blob, /Third party vendors, including Google/);
    assert.match(blob, /advertising cookies/);
    assert.match(blob, /Ads Settings/);
  });
});
