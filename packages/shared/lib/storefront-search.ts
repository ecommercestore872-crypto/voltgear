/**
 * Single storefront search-executed hook.
 * Call only when a search has actually been executed (results URL with q),
 * not on keystrokes. Dedupes React remount / double-effect for the same query.
 */

import { trackSearch as trackGaSearch } from "@/lib/analytics";
import { trackTikTokSearch } from "@/lib/tiktok-browser-events";

const recent = new Map<string, number>();
const WINDOW_MS = 2000;

export function recordStorefrontSearch(rawQuery: string): boolean {
  const q = (rawQuery ?? "").trim();
  if (!q) return false;
  const now = Date.now();
  const prev = recent.get(q) ?? 0;
  if (now - prev < WINDOW_MS) return false;
  recent.set(q, now);
  try {
    trackGaSearch(q);
  } catch {
    // fail-open
  }
  try {
    trackTikTokSearch(q);
  } catch {
    // fail-open
  }
  return true;
}

recordStorefrontSearch.reset = () => recent.clear();
