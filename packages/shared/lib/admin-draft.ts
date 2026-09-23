import type { ChromeLink } from "@/lib/chrome-nav-rules";
import { parseChromeLinks } from "@/lib/chrome-nav-rules";

/** Published row draft JSON — never assume shape; Supabase JSONB can be null, string, or wrong type. */
export function adminDraftBag(row: unknown): Record<string, unknown> {
  if (row == null || typeof row !== "object") return {};
  const draft = (row as { draft?: unknown }).draft;
  if (draft == null) return {};
  if (typeof draft === "object" && !Array.isArray(draft)) {
    return draft as Record<string, unknown>;
  }
  return {};
}

export function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (item == null ? "" : String(item)).trim())
    .filter(Boolean);
}

export function asObjectRecords(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Record<string, unknown> =>
      item != null && typeof item === "object" && !Array.isArray(item),
  );
}

export function draftFieldString(
  row: unknown,
  draftKey: string,
  liveValue: unknown,
  fallback = "",
): string {
  const d = adminDraftBag(row);
  const fromDraft = d[draftKey];
  if (fromDraft != null && fromDraft !== "") return String(fromDraft);
  if (liveValue != null && liveValue !== "") return String(liveValue);
  return fallback;
}

export function chromeLinksField(raw: unknown, fallback: ChromeLink[]): ChromeLink[] {
  return parseChromeLinks(raw) ?? fallback;
}