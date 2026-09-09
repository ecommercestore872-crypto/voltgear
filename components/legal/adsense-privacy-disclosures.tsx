import Link from "next/link";

import {
  ADSENSE_ABOUTADS_URL,
  ADSENSE_ADS_SETTINGS_URL,
  ADSENSE_GOOGLE_DATA_URL,
  ADSENSE_REQUIRED_PRIVACY_FACTS,
} from "@/lib/adsense-policy";

export function AdsensePrivacyDisclosures({
  contactHref = "/contact",
}: {
  contactHref?: string;
}) {
  return (
    <section
      aria-labelledby="adsense-privacy-heading"
      className="mt-10 space-y-4"
    >
      <h2 id="adsense-privacy-heading">
        Advertising cookies and Google AdSense
      </h2>
      <p>
        When this site shows Google ads (or is reviewed for Google AdSense),
        third parties may place and read cookies on your browser, or use web
        beacons, IP addresses, or similar identifiers to collect information as
        a result of ad serving. We do not sell your personal information.
      </p>
      <p>{ADSENSE_REQUIRED_PRIVACY_FACTS[0]}</p>
      <p>{ADSENSE_REQUIRED_PRIVACY_FACTS[1]}</p>
      <p>
        {ADSENSE_REQUIRED_PRIVACY_FACTS[2]} (
        <a
          href={ADSENSE_ADS_SETTINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          {ADSENSE_ADS_SETTINGS_URL.replace("https://", "")}
        </a>
        ). You can also opt out of some third-party vendors&apos; use of cookies
        for personalized advertising at{" "}
        <a
          href={ADSENSE_ABOUTADS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          www.aboutads.info
        </a>
        .
      </p>
      <p>
        For Google&apos;s own explanation of the data it collects when you use
        partner sites, see{" "}
        <a
          href={ADSENSE_GOOGLE_DATA_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          How Google uses data when you use our partners&apos; sites or apps
        </a>
        .
      </p>
      <p>
        Questions about this policy: use our{" "}
        <Link href={contactHref}>contact page</Link>.
      </p>
    </section>
  );
}
