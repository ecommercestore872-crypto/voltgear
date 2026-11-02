import { canSendMetaBrowserEvents } from "./meta-pixel-events";

declare global { interface Window { __META_PENDING_CLICK__?: { id: string; at: number }; } }

/** Capture before marketing URL cleanup; keep pre-consent data in memory only. */
export function captureMetaClick(href: string): void {
  try {
    const id = new URL(href, "https://buyntryy.com").searchParams.get("fbclid");
    if (id && /^[A-Za-z0-9_-]{1,400}$/.test(id)) window.__META_PENDING_CLICK__ = { id, at: Date.now() };
    persistMetaClick();
  } catch { /* unavailable browser */ }
}

export function persistMetaClick(): void {
  if (!canSendMetaBrowserEvents() || !window.__META_PENDING_CLICK__) return;
  const click = window.__META_PENDING_CLICK__;
  document.cookie = `_fbc=fb.1.${click.at}.${click.id}; Path=/; Max-Age=7776000; SameSite=Lax; Secure`;
  window.__META_PENDING_CLICK__ = undefined;
}
