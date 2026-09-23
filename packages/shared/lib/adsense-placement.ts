/**
 * Visible AdSense units belong on reading pages only.
 * The site-wide adsbygoogle.js tag is ownership verification, not a banner.
 *
 * @see https://support.google.com/adsense/answer/48182 (non-content pages, ad labels)
 * @see https://support.google.com/adsense/answer/1282097 (placement near content, not navigation)
 * @see https://support.google.com/adsense/answer/10502938 (valuable inventory — thin pages)
 */

export function allowsAdsenseDisplayAds(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  // Individual guides only — never home, cart, checkout, contact, or /blog index.
  return /^\/blog\/[^/]+$/.test(path);
}
