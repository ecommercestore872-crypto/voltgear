import type { ClickAttributionInput } from "@/lib/db/order-attribution-rules";
import { canSendMetaBrowserEvent } from "@/lib/meta-consent";

export const CLICK_ATTRIB_STORAGE_KEY = "vg_click_attrib";

const PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "ttclid",
  "fbclid",
  "gclid",
] as const;

export function captureClickAttribution(href: string): ClickAttributionInput {
  const out: ClickAttributionInput = {};
  try {
    const url = new URL(href, typeof window === "undefined" ? "https://example.invalid" : window.location.origin);
    for (const param of PARAMS) {
      const value = url.searchParams.get(param);
      if (value) {
        out[param] = value;
      }
    }
  } catch {
    // ignore malformed href
  }
  return out;
}

export function mergeClickAttribution(
  base: ClickAttributionInput,
  extra: ClickAttributionInput,
): ClickAttributionInput {
  return { ...base, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) };
}

export function readStoredClickAttribution(): ClickAttributionInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLICK_ATTRIB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClickAttributionInput;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function persistClickAttribution(input: ClickAttributionInput): void {
  if (typeof window === "undefined") return;
  if (!Object.keys(input).length) return;
  if (input.fbclid) writeMetaFbcCookie(input.fbclid);
  try {
    const prev = readStoredClickAttribution();
    const merged = mergeClickAttribution(prev ?? {}, input);
    sessionStorage.setItem(CLICK_ATTRIB_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage errors
  }
}

export function writeMetaFbcCookie(fbclid: string | null | undefined): void {
  if (typeof document === "undefined" || !canSendMetaBrowserEvent()) return;
  const clickId = fbclid?.trim();
  if (!clickId || !/^[A-Za-z0-9_-]{1,500}$/.test(clickId)) return;
  const current = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1];
  if (current?.endsWith(`.${clickId}`)) return;
  const value = `fb.1.${Date.now()}.${clickId}`;
  document.cookie = `_fbc=${value}; Path=/; Max-Age=7776000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
}

export function parseClickAttributionBody(raw: unknown): ClickAttributionInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const out: ClickAttributionInput = {};
  for (const key of PARAMS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return Object.keys(out).length ? out : null;
}
