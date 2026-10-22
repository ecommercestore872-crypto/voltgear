import type { InboxKind, InboxStatus } from "./db/inbox-rules";

export const INBOX_PAGE_SIZE = 50;

export type InboxListFilters = {
  kind: InboxKind | "all";
  status: InboxStatus | "all";
  q: string;
  page: number;
};

export function normalizeInboxPage(raw: unknown): number {
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1;
}

export function normalizeInboxSearch(raw: unknown): string {
  return String(raw ?? "").replace(/[,%_()\\"*]/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 80);
}

export function inboxListFilters(raw: {
  kind?: unknown; status?: unknown; q?: unknown; page?: unknown;
}): InboxListFilters {
  return {
    kind: raw.kind === "contact" || raw.kind === "complaint" ? raw.kind : "all",
    status: raw.status === "new" || raw.status === "read" || raw.status === "closed" ? raw.status : "all",
    q: normalizeInboxSearch(raw.q),
    page: normalizeInboxPage(raw.page),
  };
}

export function inboxListHref(filters: InboxListFilters): string {
  const params = new URLSearchParams();
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.status !== "all") params.set("status", filters.status);
  const q = normalizeInboxSearch(filters.q);
  if (q) params.set("q", q);
  if (filters.page > 1) params.set("page", String(filters.page));
  return `/admin/inbox${params.size ? `?${params}` : ""}`;
}

export function inboxNoteIsDirty(note: string, savedNote: string): boolean {
  return note !== savedNote;
}
