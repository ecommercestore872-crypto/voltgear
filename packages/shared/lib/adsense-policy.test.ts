import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADSENSE_CERT_AUTHORITY_ID,
  ADSENSE_CRAWLER_USER_AGENTS,
  ADSENSE_REQUIRED_PRIVACY_FACTS,
  adsTxtBody,
  adsenseCrawlerRobotsRule,
  adsenseHeadScriptSrc,
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

describe("adsense connection crawlers", () => {
  it("names the crawlers Google uses to verify and read the site", () => {
    assert.deepEqual(ADSENSE_CRAWLER_USER_AGENTS, [
      "Mediapartners-Google",
      "Google-Display-Ads-Bot",
    ]);
  });

  it("allows those crawlers at the site root with no Disallow", () => {
    const rule = adsenseCrawlerRobotsRule();
    assert.deepEqual(rule.userAgent, [
      "Mediapartners-Google",
      "Google-Display-Ads-Bot",
    ]);
    assert.equal(rule.allow, "/");
    assert.equal("disallow" in rule, false);
  });

  it("builds the official head snippet URL with the publisher client", () => {
    assert.equal(
      adsenseHeadScriptSrc("ca-pub-1159111109427878"),
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1159111109427878"
    );
  });
});
