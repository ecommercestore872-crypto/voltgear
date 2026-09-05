/**
 * AdSense site-readiness helpers.
 *
 * Official sources:
 * - https://support.google.com/adsense/answer/1348695 (required privacy disclosures)
 * - https://support.google.com/adsense/answer/10502938 (publisher privacy policies)
 * - https://support.google.com/adsense/answer/7532444 (ads.txt)
 * - https://support.google.com/adsense/answer/48182 (program policies)
 * - https://support.google.com/adsense/answer/81904 (insufficient content / navigation)
 */

export const ADSENSE_ADS_SETTINGS_URL = "https://adssettings.google.com";
export const ADSENSE_ABOUTADS_URL = "https://www.aboutads.info";
export const ADSENSE_GOOGLE_DATA_URL =
  "https://policies.google.com/technologies/partner-sites";
export const ADSENSE_CERT_AUTHORITY_ID = "f08c47fec0942fa0";

/** Public AdSense client Google issued for buyntryy.com site verification. */
export const BUY_N_TRY_ADSENSE_PUB_ID = "ca-pub-1159111109427878";

/** Phrases Google requires publishers to disclose for advertising cookies. */
export const ADSENSE_REQUIRED_PRIVACY_FACTS = [
  "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.",
  "Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.",
  "Users may opt out of personalized advertising by visiting Ads Settings.",
] as const;

export function normalizeAdsensePublisherId(
  raw?: string | null
): { scriptClient: string; adsTxtPub: string } | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const pub = trimmed.startsWith("ca-") ? trimmed.slice(3) : trimmed;
  if (!/^pub-\d{10,20}$/.test(pub)) return null;
  if (/^pub-0+$/.test(pub)) return null;
  return { scriptClient: `ca-${pub}`, adsTxtPub: pub };
}

export function resolveAdsensePublisherId(raw?: string | null): {
  scriptClient: string;
  adsTxtPub: string;
} {
  return (
    normalizeAdsensePublisherId(raw) ??
    normalizeAdsensePublisherId(BUY_N_TRY_ADSENSE_PUB_ID)!
  );
}

export function adsTxtBody(rawPubId?: string | null): string {
  const ids = resolveAdsensePublisherId(rawPubId);
  const lines = [
    "# ads.txt — Authorized Digital Sellers (IAB Tech Lab)",
    "# https://support.google.com/adsense/answer/7532444",
  ];
  lines.push(
    `google.com, ${ids.adsTxtPub}, DIRECT, ${ADSENSE_CERT_AUTHORITY_ID}`
  );
  return `${lines.join("\n")}\n`;
}
