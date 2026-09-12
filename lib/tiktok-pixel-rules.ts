/**
 * Rules for loading the official TikTok Pixel base code.
 * No ecommerce events, Events API, or Advanced Matching here.
 */

export function shouldLoadTikTokPixel(input: {
  pixelId?: string | null;
  enabled?: string | boolean | null;
  consent: "all" | "essential" | null;
  pathname?: string | null;
  nodeEnv?: string | null;
  host?: string | null;
}): boolean {
  const pixelId = (input.pixelId ?? "").trim();
  if (!pixelId) return false;

  const enabled =
    input.enabled === true ||
    String(input.enabled ?? "")
      .trim()
      .toLowerCase() === "true";
  if (!enabled) return false;

  if (input.consent !== "all") return false;

  const nodeEnv = (input.nodeEnv ?? process.env.NODE_ENV ?? "").toLowerCase();
  if (nodeEnv === "development") return false;

  const host = (input.host ?? "").split(":")[0]?.toLowerCase() ?? "";
  if (host === "localhost" || host === "127.0.0.1") return false;

  const path = input.pathname ?? "";
  if (
    path.startsWith("/admin") ||
    path.startsWith("/studio") ||
    path.startsWith("/demo")
  ) {
    return false;
  }

  return true;
}

/** Official base-code bootstrap (methods list + load + page). Pixel ID injected safely. */
export function tiktokPixelBootstrapSource(pixelId: string): string {
  const id = JSON.stringify(pixelId.trim());
  return `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load(${id});
  ttq.page();
}(window, document, 'ttq');`;
}
