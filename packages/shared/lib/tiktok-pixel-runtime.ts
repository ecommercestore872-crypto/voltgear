import { shouldLoadTikTokPixel, tiktokPixelBootstrapSource } from "./tiktok-pixel-rules";
import type {} from "./tiktok-browser-events";

function allowed(): boolean {
  try {
    const consent = window.localStorage.getItem("bnt-cookie-consent");
    return shouldLoadTikTokPixel({
      pixelId: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
      enabled: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ENABLED,
      consent: consent === "all" ? "all" : null,
      pathname: window.location.pathname,
      host: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
    });
  } catch { return false; }
}

function watchSdk(base: HTMLElement, sdk: HTMLScriptElement): void {
  sdk.dataset.state = "loading";
  sdk.addEventListener("load", () => { sdk.dataset.state = "ready"; }, { once: true });
  sdk.addEventListener("error", () => {
    sdk.dataset.state = "failed";
    retrySdk(base, sdk);
  }, { once: true });
}

function retrySdk(base: HTMLElement, sdk: HTMLScriptElement): void {
  const retries = Number(base.dataset.retries || "0");
  if (retries >= 2 || sdk.dataset.state !== "failed" || !allowed()) return;
  base.dataset.retries = String(retries + 1);
  sdk.dataset.state = "retrying";
  window.setTimeout(() => {
    if (!allowed()) {
      sdk.dataset.state = "failed";
      base.dataset.retries = String(retries);
      return;
    }
    const next = document.createElement("script");
    next.id = sdk.id;
    next.async = true;
    next.src = sdk.src;
    watchSdk(base, next);
    document.getElementById(sdk.id)?.remove();
    document.head.appendChild(next);
  }, (retries + 1) * 500);
}

/** Idempotent across deferred mounting, React remounts, consent and SPA navigation. */
export function syncTikTokPixel(): void {
  if (typeof window === "undefined") return;
  let base = document.getElementById("tiktok-pixel-base");
  if (!allowed()) {
    window.ttq?.revokeConsent?.();
    if (base) base.dataset.page = "";
    return;
  }
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID!.trim();
  const page = window.location.pathname;
  if (base && window.ttq) {
    window.ttq.grantConsent?.();
    if (base.dataset.page !== page) {
      window.ttq.page?.();
      base.dataset.page = page;
    }
    const sdk = document.getElementById("tiktok-pixel-sdk") as HTMLScriptElement | null;
    if (sdk) retrySdk(base, sdk);
    return;
  }
  base?.remove();
  base = document.createElement("script");
  base.id = "tiktok-pixel-base";
  base.dataset.page = page;
  base.textContent = tiktokPixelBootstrapSource(pixelId);
  document.head.appendChild(base);

  const sdk = document.getElementById("tiktok-pixel-sdk") as HTMLScriptElement | null;
  if (!sdk) return;
  watchSdk(base, sdk);
}
